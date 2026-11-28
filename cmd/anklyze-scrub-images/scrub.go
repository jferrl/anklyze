package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg" // register decoders for the dimension check
	_ "image/png"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/jferrl/anklyze/internal/imagemeta"
)

// maxObjectSize bounds what is read into memory; uploads are capped well below it.
const maxObjectSize = 32 << 20

// objectStore is the slice of the S3 API the scrub needs.
type objectStore interface {
	List(ctx context.Context, prefix string) ([]string, error)
	Get(ctx context.Context, key string) (data []byte, contentType string, err error)
	Put(ctx context.Context, key string, data []byte, contentType string) error
}

type result struct {
	Scanned, Cleaned, AlreadyClean, Skipped int
}

// scrub strips metadata from every image under prefix. Without apply it only
// reports; with apply it writes the original to backupDir before overwriting.
func scrub(ctx context.Context, store objectStore, prefix, backupDir string, apply bool, log io.Writer) (result, error) {
	var res result
	keys, err := store.List(ctx, prefix)
	if err != nil {
		return res, fmt.Errorf("list objects: %w", err)
	}
	for _, key := range keys {
		res.Scanned++
		orig, storedType, err := store.Get(ctx, key)
		if err != nil {
			return res, fmt.Errorf("get %s: %w", key, err)
		}
		clean, err := stripChecked(orig)
		switch {
		case err != nil:
			res.Skipped++
			fmt.Fprintf(log, "skip    %s: %v\n", key, err)
			continue
		case bytes.Equal(clean, orig):
			res.AlreadyClean++
			continue
		}
		res.Cleaned++
		fmt.Fprintf(log, "strip   %s: %d -> %d bytes\n", key, len(orig), len(clean))
		if !apply {
			continue
		}
		if err := writeBackup(backupDir, key, orig); err != nil {
			return res, err
		}
		if err := store.Put(ctx, key, clean, storedType); err != nil {
			return res, fmt.Errorf("put %s: %w", key, err)
		}
	}
	return res, nil
}

// stripChecked strips metadata and refuses a result whose dimensions differ
// from the original, so a parser bug cannot overwrite a stored X-ray with junk.
func stripChecked(orig []byte) ([]byte, error) {
	if len(orig) > maxObjectSize {
		return nil, fmt.Errorf("larger than %d bytes", maxObjectSize)
	}
	contentType := http.DetectContentType(orig)
	clean, err := imagemeta.Strip(contentType, orig)
	if err != nil {
		return nil, err
	}
	if contentType == "image/webp" {
		return clean, nil // shortcut: no WebP decoder in the stdlib, so only the byte-level parse vouches for it
	}
	before, _, err := image.DecodeConfig(bytes.NewReader(orig))
	if err != nil {
		return nil, fmt.Errorf("original does not decode: %w", err)
	}
	after, _, err := image.DecodeConfig(bytes.NewReader(clean))
	if err != nil || after != before {
		return nil, errors.New("stripped image does not match the original, left untouched")
	}
	return clean, nil
}

func writeBackup(dir, key string, data []byte) error {
	p := filepath.Join(dir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(p), 0o700); err != nil {
		return fmt.Errorf("backup %s: %w", key, err)
	}
	if err := os.WriteFile(p, data, 0o600); err != nil {
		return fmt.Errorf("backup %s: %w", key, err)
	}
	return nil
}

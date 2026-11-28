package main

import (
	"bytes"
	"context"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"maps"
	"os"
	"path/filepath"
	"slices"
	"testing"
)

type memStore map[string][]byte

func (m memStore) List(context.Context, string) ([]string, error) {
	return slices.Sorted(maps.Keys(m)), nil
}

func (m memStore) Get(_ context.Context, key string) ([]byte, string, error) {
	return m[key], "application/octet-stream", nil
}

func (m memStore) Put(_ context.Context, key string, data []byte, _ string) error {
	m[key] = data
	return nil
}

const secret = "Jane Doe"

func fixtures(t *testing.T) memStore {
	t.Helper()
	img := image.NewGray(image.Rect(0, 0, 8, 8))
	var j, p bytes.Buffer
	if err := jpeg.Encode(&j, img, nil); err != nil {
		t.Fatal(err)
	}
	if err := png.Encode(&p, img); err != nil {
		t.Fatal(err)
	}
	com := append([]byte{0xFF, 0xFE, 0, byte(len(secret) + 2)}, secret...)
	dirty := append(append([]byte{0xFF, 0xD8}, com...), j.Bytes()[2:]...)
	return memStore{
		"cases/a/xray/dirty.jpg": dirty,
		"cases/a/xray/clean.png": p.Bytes(),
		"cases/a/xray/old.gif":   []byte("GIF89a" + secret),
	}
}

func TestScrubDryRunWritesNothing(t *testing.T) {
	store := fixtures(t)
	before := maps.Clone(store)
	res, err := scrub(context.Background(), store, "cases/", "", false, io.Discard)
	if err != nil {
		t.Fatal(err)
	}
	if res != (result{Scanned: 3, Cleaned: 1, AlreadyClean: 1, Skipped: 1}) {
		t.Errorf("result = %+v", res)
	}
	if !maps.EqualFunc(store, before, bytes.Equal) {
		t.Error("dry run changed stored objects")
	}
}

func TestScrubApplyBacksUpAndStrips(t *testing.T) {
	store := fixtures(t)
	orig := store["cases/a/xray/dirty.jpg"]
	dir := t.TempDir()
	if _, err := scrub(context.Background(), store, "cases/", dir, true, io.Discard); err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(store["cases/a/xray/dirty.jpg"], []byte(secret)) {
		t.Error("stored JPEG still carries metadata")
	}
	if _, err := jpeg.Decode(bytes.NewReader(store["cases/a/xray/dirty.jpg"])); err != nil {
		t.Errorf("stored JPEG no longer decodes: %v", err)
	}
	backup, err := os.ReadFile(filepath.Join(dir, "cases/a/xray/dirty.jpg"))
	if err != nil || !bytes.Equal(backup, orig) {
		t.Errorf("backup missing or different: %v", err)
	}
	if !bytes.Equal(store["cases/a/xray/old.gif"], []byte("GIF89a"+secret)) {
		t.Error("unsupported GIF was modified")
	}
}

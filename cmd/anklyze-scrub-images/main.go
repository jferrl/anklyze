// Command anklyze-scrub-images strips metadata (EXIF, XMP, comments, text
// chunks) from case images uploaded before uploads were stripped on arrival.
//
// It reads the same S3_* and STUDY_BUCKET_NAME variables as the API server and
// only reports unless -apply is given:
//
//	anklyze-scrub-images                                 # dry run
//	anklyze-scrub-images -apply -backup ./originals      # overwrite, keeping originals
package main

import (
	"bytes"
	"context"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"os"

	"github.com/jferrl/anklyze/internal/config"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

func main() {
	apply := flag.Bool("apply", false, "overwrite stripped images (default: report only)")
	backup := flag.String("backup", "", "directory to save originals in before overwriting (required with -apply)")
	prefix := flag.String("prefix", "cases/", "object key prefix to scan")
	flag.Parse()

	if *apply && *backup == "" {
		fmt.Fprintln(os.Stderr, "-apply needs -backup: originals are saved before they are overwritten")
		os.Exit(2)
	}
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid configuration", "error", err)
		os.Exit(1)
	}
	if !cfg.HasS3Storage() {
		slog.Error("S3_ENDPOINT, S3_ACCESS_KEY and S3_SECRET_KEY are required")
		os.Exit(1)
	}
	client, err := minio.New(cfg.S3Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.S3AccessKey, cfg.S3SecretKey, ""),
		Secure: cfg.S3UseSSL,
	})
	if err != nil {
		slog.Error("S3 client", "error", err)
		os.Exit(1)
	}

	store := minioStore{client: client, bucket: cfg.StudyBucketName}
	res, err := scrub(context.Background(), store, *prefix, *backup, *apply, os.Stdout)
	mode := "dry run, nothing written"
	if *apply {
		mode = "applied"
	}
	fmt.Printf("\n%s: scanned %d, stripped %d, already clean %d, skipped %d\n",
		mode, res.Scanned, res.Cleaned, res.AlreadyClean, res.Skipped)
	if err != nil {
		slog.Error("scrub stopped", "error", err)
		os.Exit(1)
	}
}

type minioStore struct {
	client *minio.Client
	bucket string
}

func (s minioStore) List(ctx context.Context, prefix string) ([]string, error) {
	var keys []string
	for obj := range s.client.ListObjects(ctx, s.bucket, minio.ListObjectsOptions{Prefix: prefix, Recursive: true}) {
		if obj.Err != nil {
			return nil, obj.Err
		}
		keys = append(keys, obj.Key)
	}
	return keys, nil
}

func (s minioStore) Get(ctx context.Context, key string) ([]byte, string, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, "", err
	}
	defer obj.Close()
	info, err := obj.Stat()
	if err != nil {
		return nil, "", err
	}
	data, err := io.ReadAll(io.LimitReader(obj, maxObjectSize+1))
	return data, info.ContentType, err
}

func (s minioStore) Put(ctx context.Context, key string, data []byte, contentType string) error {
	_, err := s.client.PutObject(ctx, s.bucket, key, bytes.NewReader(data), int64(len(data)),
		minio.PutObjectOptions{ContentType: contentType})
	return err
}

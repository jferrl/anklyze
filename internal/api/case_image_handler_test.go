package api

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jferrl/anklyze/internal/domain"
	"github.com/jferrl/anklyze/internal/repository"
	"github.com/jferrl/anklyze/internal/storage"
)

type imageRepo struct {
	repository.CaseRepository
	cs    *domain.Case
	img   *domain.CaseImage // returned by GetImageByID/GetImages when set
	added *domain.CaseImage
}

func (r *imageRepo) GetByID(context.Context, uuid.UUID) (*domain.Case, error) { return r.cs, nil }
func (r *imageRepo) AddImage(_ context.Context, img *domain.CaseImage) error {
	r.added = img
	return nil
}
func (r *imageRepo) UpdateHasTACImages(context.Context, uuid.UUID) error { return nil }
func (r *imageRepo) GetImageByID(context.Context, uuid.UUID) (*domain.CaseImage, error) {
	return r.img, nil
}
func (r *imageRepo) GetImages(context.Context, uuid.UUID) ([]domain.CaseImage, error) {
	if r.img == nil {
		return nil, nil
	}
	return []domain.CaseImage{*r.img}, nil
}

type recordingStorage struct {
	storage.NoOpStorage
	path, contentType string
	data              []byte
}

func (s *recordingStorage) Upload(_ context.Context, path string, r io.Reader, contentType string, size int64) error {
	s.path, s.contentType = path, contentType
	var err error
	s.data, err = io.ReadAll(r)
	if err == nil && int64(len(s.data)) != size {
		err = fmt.Errorf("read %d bytes, size said %d", len(s.data), size)
	}
	return err
}

func encodeTestImage(enc func(io.Writer, image.Image) error) []byte {
	var buf bytes.Buffer
	if err := enc(&buf, image.NewGray(image.Rect(0, 0, 4, 4))); err != nil {
		panic(err)
	}
	return buf.Bytes()
}

var (
	pngBytes  = encodeTestImage(png.Encode)
	jpegBytes = encodeTestImage(func(w io.Writer, m image.Image) error { return jpeg.Encode(w, m, nil) })
	// jpegWithComment carries a COM segment with an identifying string.
	jpegWithComment = append(append([]byte{0xFF, 0xD8, 0xFF, 0xFE, 0x00, byte(2 + len("Jane Doe 1980"))}, "Jane Doe 1980"...), jpegBytes[2:]...)
)

func uploadRequest(t *testing.T, caseID uuid.UUID, category, filename, partType string, data []byte) *http.Request {
	t.Helper()
	var body bytes.Buffer
	mw := multipart.NewWriter(&body)
	_ = mw.WriteField("category", category)
	part, err := mw.CreatePart(map[string][]string{
		"Content-Disposition": {`form-data; name="file"; filename="` + filename + `"`},
		"Content-Type":        {partType},
	})
	if err != nil {
		t.Fatal(err)
	}
	_, _ = part.Write(data)
	_ = mw.Close()
	req := httptest.NewRequest(http.MethodPost, "/cases/"+caseID.String()+"/images", &body)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	return req
}

func TestUploadImage(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	big := append([]byte("\x89PNG\r\n\x1a\n"), make([]byte, MaxImageSize)...)

	tests := []struct {
		name       string
		category   string
		filename   string
		partType   string
		data       []byte
		store      storage.Storage // nil: a recordingStorage
		wantStatus int
		wantCode   string
		wantExt    string
		wantType   string
		wantName   string
	}{
		{name: "valid png", category: "xray", filename: "a.png", partType: "image/png", data: pngBytes,
			wantStatus: 201, wantExt: ".png", wantType: "image/png", wantName: "a.png"},
		{name: "extension comes from content, not filename", category: "tac", filename: "scan.exe", partType: "image/png", data: pngBytes,
			wantStatus: 201, wantExt: ".png", wantType: "image/png", wantName: "scan.exe"},
		{name: "client type wrong but bytes are jpeg", category: "xray", filename: "a.png", partType: "image/png", data: jpegBytes,
			wantStatus: 201, wantExt: ".jpg", wantType: "image/jpeg", wantName: "a.png"},
		{name: "metadata stripped before storage", category: "xray", filename: "a.jpg", partType: "image/jpeg", data: jpegWithComment,
			wantStatus: 201, wantExt: ".jpg", wantType: "image/jpeg", wantName: "a.jpg"},
		{name: "gif rejected", category: "xray", filename: "a.gif", partType: "image/gif", data: []byte("GIF89a\x01\x00\x01\x00\x00\x00\x00;"),
			wantStatus: 400},
		{name: "corrupt png rejected", category: "xray", filename: "a.png", partType: "image/png", data: pngBytes[:40],
			wantStatus: 400},
		{name: "spoofed image type over html", category: "xray", filename: "a.png", partType: "image/png", data: []byte("<html><script>alert(1)</script></html>"),
			wantStatus: 400},
		{name: "octet-stream is not trusted", category: "xray", filename: "a.png", partType: "application/octet-stream", data: []byte("MZ\x90\x00 not an image"),
			wantStatus: 400},
		{name: "svg rejected", category: "xray", filename: "a.svg", partType: "image/png", data: []byte(`<svg xmlns="http://www.w3.org/2000/svg"/>`),
			wantStatus: 400},
		{name: "oversized", category: "xray", filename: "a.png", partType: "image/png", data: big,
			wantStatus: 400, wantCode: CodeInvalidInput},
		{name: "unknown category", category: "mri", filename: "a.png", partType: "image/png", data: pngBytes,
			wantStatus: 400},
		{name: "empty category", category: "", filename: "a.png", partType: "image/png", data: pngBytes,
			wantStatus: 400},
		{name: "traversal filename sanitised", category: "xray", filename: `../../etc/pass\..\wd.png`, partType: "image/png", data: pngBytes,
			wantStatus: 201, wantExt: ".png", wantType: "image/png", wantName: "wd.png"},
		{name: "control and bidi characters stripped", category: "xray", filename: "a\t\u202e.png", partType: "image/png", data: pngBytes,
			wantStatus: 201, wantExt: ".png", wantType: "image/png", wantName: "a.png"},
		{name: "no storage configured", category: "xray", filename: "a.png", partType: "image/png", data: pngBytes,
			store: storage.NewNoOpStorage(), wantStatus: 503, wantCode: domain.ErrCodeStorageNotConfigured},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			cs := domain.NewCase(uuid.New(), "t", "d", nil)
			repo := &imageRepo{cs: cs}
			rec := &recordingStorage{}
			var store storage.Storage = rec
			if tt.store != nil {
				store = tt.store
			}
			h := NewCaseImageHandler(repo, store, time.Minute)
			r := gin.New()
			r.POST("/cases/:id/images", h.UploadImage)

			w := httptest.NewRecorder()
			r.ServeHTTP(w, uploadRequest(t, cs.ID, tt.category, tt.filename, tt.partType, tt.data))

			if w.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d: %s", w.Code, tt.wantStatus, w.Body)
			}
			if tt.wantCode != "" && !strings.Contains(w.Body.String(), `"`+tt.wantCode+`"`) {
				t.Errorf("body %s lacks code %q", w.Body, tt.wantCode)
			}
			if tt.wantStatus != http.StatusCreated {
				if rec.path != "" || repo.added != nil {
					t.Errorf("rejected upload reached storage (%q) or repo", rec.path)
				}
				return
			}
			wantPrefix := "cases/" + cs.ID.String() + "/" + tt.category + "/"
			if !strings.HasPrefix(rec.path, wantPrefix) || !strings.HasSuffix(rec.path, tt.wantExt) ||
				strings.Count(rec.path, "/") != 3 || strings.Contains(rec.path, "..") {
				t.Errorf("storage key = %q, want %s<uuid>%s", rec.path, wantPrefix, tt.wantExt)
			}
			if rec.contentType != tt.wantType || repo.added.ContentType != tt.wantType {
				t.Errorf("content type = %q/%q, want %q", rec.contentType, repo.added.ContentType, tt.wantType)
			}
			if repo.added.Filename != tt.wantName {
				t.Errorf("filename = %q, want %q", repo.added.Filename, tt.wantName)
			}
			if bytes.Contains(rec.data, []byte("Jane Doe")) {
				t.Error("stored image still carries metadata")
			}
			if repo.added.SizeBytes != int64(len(rec.data)) {
				t.Errorf("recorded size = %d, stored %d bytes", repo.added.SizeBytes, len(rec.data))
			}
		})
	}
}

func TestSanitizeFilename(t *testing.T) {
	t.Parallel()
	tests := []struct{ in, want string }{
		{"a.png", "a.png"},
		{"../../etc/passwd", "passwd"},
		{`C:\Users\x\a.png`, "a.png"},
		{"a\x00\x1b[31m.png", "a[31m.png"},
		{"  a.png  ", "a.png"},
		{"", "image"},
		{"..", "image"},
		{"dir/..", "image"},
		{strings.Repeat("é", 300) + ".png", strings.Repeat("é", maxFilenameRunes)},
	}
	for _, tt := range tests {
		if got := sanitizeFilename(tt.in); got != tt.want {
			t.Errorf("sanitizeFilename(%q) = %q, want %q", tt.in, got, tt.want)
		}
	}
}

func TestSignedURLs_NoStorage(t *testing.T) {
	t.Parallel()
	gin.SetMode(gin.TestMode)

	cs := domain.NewCase(uuid.New(), "t", "d", nil)
	cs.Status = domain.CaseStatusPublished
	img := domain.NewCaseImage(cs.ID, domain.ImageCategoryXRay, 0, "a.png", "image/png", 1, "cases/x.png")
	repo := &imageRepo{cs: cs, img: img}
	noStore := storage.NewNoOpStorage()
	admin := NewCaseImageHandler(repo, noStore, time.Minute)
	resp := &CaseResponseHandler{caseRepo: repo, storage: noStore, signedURLDuration: time.Minute}

	r := gin.New()
	r.GET("/admin/cases/:id/images", admin.GetAdminCaseImages)
	r.GET("/admin/cases/:id/images/:imageId/url", admin.GetAdminImageSignedURL)
	r.GET("/cases/:id/images/urls", resp.GetBatchImageSignedURLs)
	r.GET("/cases/:id/images/:imageId/url", resp.GetImageSignedURL)

	id, imgID := cs.ID.String(), img.ID.String()
	for _, path := range []string{
		"/admin/cases/" + id + "/images",
		"/admin/cases/" + id + "/images/" + imgID + "/url",
		"/cases/" + id + "/images/urls",
		"/cases/" + id + "/images/" + imgID + "/url",
	} {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
		if w.Code != http.StatusServiceUnavailable || !strings.Contains(w.Body.String(), domain.ErrCodeStorageNotConfigured) {
			t.Errorf("GET %s = %d %s, want 503 %s", path, w.Code, w.Body, domain.ErrCodeStorageNotConfigured)
		}
	}
}

package imagemeta

import (
	"bytes"
	"encoding/binary"
	"errors"
	"hash/crc32"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

const secret = "PATIENT-Jane-Doe-GPS-40.4168N"

func testImage() image.Image {
	img := image.NewGray(image.Rect(0, 0, 16, 16))
	for i := range img.Pix {
		img.Pix[i] = uint8(i * 7)
	}
	return img
}

func seg(marker byte, payload []byte) []byte {
	n := len(payload) + 2
	return append([]byte{0xFF, marker, byte(n >> 8), byte(n)}, payload...)
}

// exifWithOrientation builds a little-endian EXIF payload holding Orientation
// plus an ImageDescription that carries the secret.
func exifWithOrientation(o uint16) []byte {
	tiff := []byte("II*\x00\x08\x00\x00\x00")
	ifd := make([]byte, 2+2*12+4)
	binary.LittleEndian.PutUint16(ifd, 2)
	e := ifd[2:]
	binary.LittleEndian.PutUint16(e[0:], 0x010E) // ImageDescription, ASCII
	binary.LittleEndian.PutUint16(e[2:], 2)
	binary.LittleEndian.PutUint32(e[4:], uint32(len(secret)))
	binary.LittleEndian.PutUint32(e[8:], uint32(8+len(ifd)))
	binary.LittleEndian.PutUint16(e[12:], 0x0112) // Orientation, SHORT
	binary.LittleEndian.PutUint16(e[14:], 3)
	binary.LittleEndian.PutUint32(e[16:], 1)
	binary.LittleEndian.PutUint16(e[20:], o)
	out := append([]byte("Exif\x00\x00"), tiff...)
	out = append(out, ifd...)
	return append(out, secret...)
}

func jpegWithMetadata(t *testing.T, orientation uint16) (clean, dirty []byte) {
	t.Helper()
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, testImage(), &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	clean = buf.Bytes()
	// Go's encoder writes no APPn segments, so metadata goes right after SOI.
	dirty = append([]byte{}, clean[:2]...)
	dirty = append(dirty, seg(0xE1, exifWithOrientation(orientation))...)
	dirty = append(dirty, seg(0xE1, []byte("http://ns.adobe.com/xap/1.0/\x00<x:xmpmeta>"+secret+"</x:xmpmeta>"))...)
	dirty = append(dirty, seg(0xED, []byte("Photoshop 3.0\x00"+secret))...)
	dirty = append(dirty, seg(0xE2, []byte("MPF\x00"+secret))...)
	dirty = append(dirty, seg(0xE2, []byte("ICC_PROFILE\x00\x01\x01fake-profile"))...)
	dirty = append(dirty, seg(0xFE, []byte(secret))...)
	dirty = append(dirty, clean[2:]...)
	dirty = append(dirty, []byte("\xff\xd8trailing MPF image "+secret+"\xff\xd9")...)
	return clean, dirty
}

func TestStripJPEG(t *testing.T) {
	clean, dirty := jpegWithMetadata(t, 6)

	got, err := Strip("image/jpeg", dirty)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(got, []byte(secret)) {
		t.Fatal("metadata survived stripping")
	}
	if !bytes.Contains(got, []byte("ICC_PROFILE")) {
		t.Error("ICC profile was dropped")
	}

	// Orientation survives as a minimal EXIF block.
	if len(got) < 4+34 || got[2] != 0xFF || got[3] != 0xE1 {
		t.Fatalf("expected an orientation APP1 after SOI")
	}
	if o := exifOrientation(got[6 : 4+32]); o != 6 {
		t.Errorf("orientation = %d, want 6", o)
	}

	// Pixels are untouched.
	want, err := jpeg.Decode(bytes.NewReader(clean))
	if err != nil {
		t.Fatal(err)
	}
	img, err := jpeg.Decode(bytes.NewReader(got))
	if err != nil {
		t.Fatalf("stripped JPEG does not decode: %v", err)
	}
	if !samePixels(want, img) {
		t.Error("pixels changed")
	}
}

func TestStripJPEGDefaultOrientationAddsNoEXIF(t *testing.T) {
	_, dirty := jpegWithMetadata(t, 1)
	got, err := Strip("image/jpeg", dirty)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(got, []byte("Exif")) {
		t.Error("EXIF block written for default orientation")
	}
}

func pngChunk(typ string, data []byte) []byte {
	out := binary.BigEndian.AppendUint32(nil, uint32(len(data)))
	out = append(out, typ...)
	out = append(out, data...)
	return binary.BigEndian.AppendUint32(out, crc32.ChecksumIEEE(append([]byte(typ), data...)))
}

func TestStripPNG(t *testing.T) {
	var buf bytes.Buffer
	if err := png.Encode(&buf, testImage()); err != nil {
		t.Fatal(err)
	}
	clean := buf.Bytes()
	ihdrEnd := 8 + 25 // signature + IHDR chunk
	dirty := append([]byte{}, clean[:ihdrEnd]...)
	dirty = append(dirty, pngChunk("tEXt", []byte("Author\x00"+secret))...)
	dirty = append(dirty, pngChunk("iTXt", []byte("XML:com.adobe.xmp\x00\x00\x00\x00\x00"+secret))...)
	dirty = append(dirty, pngChunk("eXIf", exifWithOrientation(1)[6:])...)
	dirty = append(dirty, clean[ihdrEnd:]...)
	dirty = append(dirty, secret...)

	got, err := Strip("image/png", dirty)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(got, []byte(secret)) {
		t.Fatal("metadata survived stripping")
	}
	if !bytes.Equal(got, clean) {
		t.Error("stripped PNG differs from the original encoding")
	}
}

func webpChunk(fourcc string, data []byte) []byte {
	out := append([]byte(fourcc), binary.LittleEndian.AppendUint32(nil, uint32(len(data)))...)
	out = append(out, data...)
	if len(data)%2 == 1 {
		out = append(out, 0)
	}
	return out
}

func TestStripWebP(t *testing.T) {
	vp8x := make([]byte, 10)
	vp8x[0] = 0x08 | 0x04 | 0x10 // EXIF, XMP, alpha
	body := webpChunk("VP8X", vp8x)
	body = append(body, webpChunk("VP8L", []byte("fake-bitstream"))...)
	body = append(body, webpChunk("EXIF", []byte(secret))...)
	body = append(body, webpChunk("XMP ", []byte(secret+"x"))...)
	dirty := append([]byte("RIFF"), binary.LittleEndian.AppendUint32(nil, uint32(4+len(body)))...)
	dirty = append(dirty, "WEBP"...)
	dirty = append(dirty, body...)

	got, err := Strip("image/webp", dirty)
	if err != nil {
		t.Fatal(err)
	}
	if bytes.Contains(got, []byte(secret)) {
		t.Fatal("metadata survived stripping")
	}
	if size := binary.LittleEndian.Uint32(got[4:8]); int(size) != len(got)-8 {
		t.Errorf("RIFF size = %d, want %d", size, len(got)-8)
	}
	if flags := got[20]; flags != 0x10 {
		t.Errorf("VP8X flags = %#x, want only alpha (0x10)", flags)
	}
}

func TestStripRejectsMalformed(t *testing.T) {
	_, dirtyJPEG := jpegWithMetadata(t, 1)
	tests := map[string]struct {
		typ  string
		data []byte
	}{
		"jpeg without SOI":      {"image/jpeg", []byte("not a jpeg")},
		"jpeg segment overrun":  {"image/jpeg", []byte{0xFF, 0xD8, 0xFF, 0xE1, 0xFF, 0xFF, 0x00}},
		"jpeg cut mid-header":   {"image/jpeg", dirtyJPEG[:5]},
		"png without signature": {"image/png", []byte("GIF89a")},
		"png chunk overrun":     {"image/png", append([]byte("\x89PNG\r\n\x1a\n\xff\xff\xff\xffIHDR"), make([]byte, 8)...)},
		"png without IEND":      {"image/png", []byte("\x89PNG\r\n\x1a\n")},
		"webp size overrun":     {"image/webp", []byte("RIFF\xff\xff\xff\x00WEBP")},
		"unsupported gif":       {"image/gif", []byte("GIF89a")},
	}
	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			if _, err := Strip(tt.typ, tt.data); !errors.Is(err, ErrMalformed) {
				t.Errorf("err = %v, want ErrMalformed", err)
			}
		})
	}
}

func samePixels(a, b image.Image) bool {
	if a.Bounds() != b.Bounds() {
		return false
	}
	for y := a.Bounds().Min.Y; y < a.Bounds().Max.Y; y++ {
		for x := a.Bounds().Min.X; x < a.Bounds().Max.X; x++ {
			if color.GrayModel.Convert(a.At(x, y)) != color.GrayModel.Convert(b.At(x, y)) {
				return false
			}
		}
	}
	return true
}

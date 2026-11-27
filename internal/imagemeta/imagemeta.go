// Package imagemeta removes metadata (EXIF, XMP, IPTC, comments, text chunks)
// from uploaded images without re-encoding the pixels, so diagnostic quality
// is untouched.
package imagemeta

import (
	"bytes"
	"encoding/binary"
	"errors"
	"fmt"
	"slices"
)

// ErrMalformed reports an image whose structure could not be parsed.
var ErrMalformed = errors.New("malformed image")

// Strip returns a copy of data without metadata. contentType is the sniffed
// type and must be image/jpeg, image/png or image/webp.
func Strip(contentType string, data []byte) ([]byte, error) {
	switch contentType {
	case "image/jpeg":
		return stripJPEG(data)
	case "image/png":
		return stripPNG(data)
	case "image/webp":
		return stripWebP(data)
	}
	return nil, fmt.Errorf("%w: unsupported type %q", ErrMalformed, contentType)
}

func malformed(format string, args ...any) error {
	return fmt.Errorf("%w: "+format, append([]any{ErrMalformed}, args...)...)
}

// stripJPEG keeps APP0 (JFIF), ICC profiles in APP2 and Adobe APP14, drops
// every other APPn and COM segment, and drops anything after the first EOI
// (MPF secondary images carry their own EXIF). A non-default EXIF orientation
// is rewritten as a minimal EXIF block so the image still displays upright.
func stripJPEG(b []byte) ([]byte, error) {
	if len(b) < 4 || b[0] != 0xFF || b[1] != 0xD8 {
		return nil, malformed("jpeg: missing SOI")
	}
	out := make([]byte, 0, len(b))
	out = append(out, 0xFF, 0xD8)
	var orientation uint16

	for i := 2; ; {
		if i+2 > len(b) || b[i] != 0xFF {
			return nil, malformed("jpeg: expected marker at %d", i)
		}
		m := b[i+1]
		switch {
		case m == 0xFF: // fill byte
			i++
			continue
		case m == 0xD9: // EOI
			return closeJPEG(out, orientation), nil
		case isStandalone(m):
			out = append(out, b[i:i+2]...)
			i += 2
			continue
		}

		seg, err := jpegSegment(b, i)
		if err != nil {
			return nil, err
		}
		i += len(seg)

		if isMetadataMarker(m) {
			out, orientation = metadataSegment(out, seg, orientation)
			continue
		}

		out = append(out, seg...)

		if m == 0xDA { // SOS: copy the entropy-coded data that follows
			j := scanEnd(b, i)
			out = append(out, b[i:j]...)
			if j == len(b) { // no EOI: close the image
				return closeJPEG(out, orientation), nil
			}
			i = j
		}
	}
}

// closeJPEG ends the image with EOI and, for a non-default orientation, puts
// a minimal EXIF block right after SOI where EXIF belongs.
func closeJPEG(out []byte, orientation uint16) []byte {
	if orientation > 1 {
		out = slices.Insert(out, 2, orientationAPP1(orientation)...)
	}
	return append(out, 0xFF, 0xD9)
}

// metadataSegment appends seg to out only if it carries rendering data, and
// picks up the first EXIF orientation it sees.
func metadataSegment(out, seg []byte, orientation uint16) ([]byte, uint16) {
	m, payload := seg[1], seg[4:]
	if orientation == 0 && m == 0xE1 {
		orientation = exifOrientation(payload)
	}
	if keepAPP(m, payload) {
		out = append(out, seg...)
	}
	return out, orientation
}

// isMetadataMarker reports APP0-APP15 and COM, the segments that can carry metadata.
func isMetadataMarker(m byte) bool {
	return (m >= 0xE0 && m <= 0xEF) || m == 0xFE
}

// isStandalone reports markers that carry no length: TEM and RST0-RST7.
func isStandalone(m byte) bool {
	return m == 0x01 || (m >= 0xD0 && m <= 0xD7)
}

// jpegSegment returns the length-prefixed segment starting at b[i].
func jpegSegment(b []byte, i int) ([]byte, error) {
	if i+4 > len(b) {
		return nil, malformed("jpeg: truncated segment header")
	}
	n := int(b[i+2])<<8 | int(b[i+3])
	if n < 2 || i+2+n > len(b) {
		return nil, malformed("jpeg: bad segment length")
	}
	return b[i : i+2+n], nil
}

// keepAPP reports whether an APPn or COM segment carries rendering data
// rather than metadata.
func keepAPP(m byte, payload []byte) bool {
	switch m {
	case 0xE0: // JFIF
		return true
	case 0xE2:
		return bytes.HasPrefix(payload, []byte("ICC_PROFILE\x00"))
	case 0xEE:
		return bytes.HasPrefix(payload, []byte("Adobe"))
	}
	return false
}

// scanEnd returns the index of the first marker after entropy-coded data
// starting at i, skipping byte stuffing (FF00) and restart markers, or len(b).
func scanEnd(b []byte, i int) int {
	for ; i+1 < len(b); i++ {
		if b[i] == 0xFF && b[i+1] != 0x00 && !isStandalone(b[i+1]) {
			return i
		}
	}
	return len(b)
}

// exifOrientation returns the IFD0 Orientation tag (1-8) of an APP1 payload,
// or 0 when there is none.
func exifOrientation(p []byte) uint16 {
	t, ok := bytes.CutPrefix(p, []byte("Exif\x00\x00"))
	if !ok || len(t) < 8 {
		return 0
	}
	var bo binary.ByteOrder
	switch string(t[:2]) {
	case "II":
		bo = binary.LittleEndian
	case "MM":
		bo = binary.BigEndian
	default:
		return 0
	}
	off := bo.Uint32(t[4:8])
	if off < 8 || uint64(off)+2 > uint64(len(t)) {
		return 0
	}
	for k := range bo.Uint16(t[off:]) {
		e := uint64(off) + 2 + 12*uint64(k)
		if e+12 > uint64(len(t)) {
			return 0
		}
		if bo.Uint16(t[e:]) == 0x0112 {
			if v := bo.Uint16(t[e+8:]); v >= 1 && v <= 8 {
				return v
			}
			return 0
		}
	}
	return 0
}

// orientationAPP1 builds an APP1 segment whose EXIF holds only Orientation.
func orientationAPP1(o uint16) []byte {
	seg := []byte{
		0xFF, 0xE1, 0x00, 0x22, // marker, length 34
		'E', 'x', 'i', 'f', 0, 0,
		'M', 'M', 0x00, 0x2A, 0, 0, 0, 8, // big-endian TIFF header, IFD0 at 8
		0, 1, // one entry
		0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 0, 0, 0, // Orientation, SHORT, 1, value set below
		0, 0, 0, 0, // no next IFD
	}
	binary.BigEndian.PutUint16(seg[28:], o)
	return seg
}

// stripPNG drops text, EXIF and timestamp chunks and anything after IEND.
// shortcut: an eXIf orientation is dropped too; PNG X-rays don't carry one in practice.
func stripPNG(b []byte) ([]byte, error) {
	const sig = "\x89PNG\r\n\x1a\n"
	if !bytes.HasPrefix(b, []byte(sig)) {
		return nil, malformed("png: missing signature")
	}
	out := make([]byte, 0, len(b))
	out = append(out, sig...)
	for rest := b[len(sig):]; ; {
		if len(rest) < 12 {
			return nil, malformed("png: truncated chunk")
		}
		n := binary.BigEndian.Uint32(rest)
		typ := string(rest[4:8])
		if int64(n) > int64(len(rest)-12) {
			return nil, malformed("png: chunk %q overruns file", typ)
		}
		chunk := rest[:12+n]
		rest = rest[12+n:]
		switch typ {
		case "tEXt", "zTXt", "iTXt", "eXIf", "tIME":
		default:
			out = append(out, chunk...)
		}
		if typ == "IEND" {
			return out, nil
		}
	}
}

// stripWebP drops EXIF and XMP chunks, clears their VP8X flags and fixes the
// RIFF size.
func stripWebP(b []byte) ([]byte, error) {
	if len(b) < 12 || string(b[:4]) != "RIFF" || string(b[8:12]) != "WEBP" {
		return nil, malformed("webp: missing RIFF header")
	}
	riffSize := binary.LittleEndian.Uint32(b[4:8])
	if int64(riffSize) > int64(len(b)-8) || riffSize < 4 {
		return nil, malformed("webp: RIFF size overruns file")
	}
	out := make([]byte, 0, len(b))
	out = append(out, b[:12]...)
	var removed uint32
	for rest := b[12 : 8+riffSize]; len(rest) > 0; {
		if len(rest) < 8 {
			return nil, malformed("webp: truncated chunk")
		}
		fourcc := string(rest[:4])
		n := binary.LittleEndian.Uint32(rest[4:8])
		size := uint64(n) + 8 + uint64(n&1)
		if size > uint64(len(rest)) {
			return nil, malformed("webp: chunk %q overruns file", fourcc)
		}
		chunk := rest[:size]
		rest = rest[size:]
		switch fourcc {
		case "EXIF", "XMP ":
			removed += n + 8 + n&1 // bounded by riffSize, checked above
		case "VP8X":
			start := len(out)
			out = append(out, chunk...)
			if n > 0 {
				out[start+8] &^= 0x08 | 0x04 // EXIF and XMP present flags
			}
		default:
			out = append(out, chunk...)
		}
	}
	binary.LittleEndian.PutUint32(out[4:8], riffSize-removed)
	return out, nil
}

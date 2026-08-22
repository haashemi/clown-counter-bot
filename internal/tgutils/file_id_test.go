package tgutils_test

import (
	"encoding/base64"
	"encoding/binary"
	"testing"

	"github.com/haashemi/clown-counter-bot/internal/tgutils"
)

const kindDocument = "document"

// rleEncode is the inverse of rleDecode, used only for building a test vector.
func rleEncode(data []byte) []byte {
	var out []byte

	i := 0
	for i < len(data) {
		if data[i] == 0 {
			n := 0
			for i+n < len(data) && data[i+n] == 0 && n < 255 {
				n++
			}

			out = append(out, 0, byte(n))
			i += n

			continue
		}

		out = append(out, data[i])
		i++
	}

	return out
}

func TestParseStickerFileId(t *testing.T) {
	t.Parallel()

	// type_id = TYPE_STICKER (8) | TYPE_ID_FILE_REFERENCE_FLAG (1<<25)
	typeID := uint32(tgutils.TypeSticker | (1 << 25))
	dcID := uint32(2)
	fileRef := [...]byte{0x01, 0x02, 0x03}
	id := int64(0x0102030405060708)
	accessHash := int64(0x1020304050607080)

	raw := make([]byte, 0, 4+4+4+len(fileRef)+8+8+2)

	var buf [4]byte
	binary.LittleEndian.PutUint32(buf[:], typeID)
	raw = append(raw, buf[:]...)

	binary.LittleEndian.PutUint32(buf[:], dcID)
	raw = append(raw, buf[:]...)

	// TL string: length + data (+ padding)
	raw = append(raw, byte(len(fileRef)))
	raw = append(raw, fileRef[:]...)

	for len(raw)%4 != 0 {
		raw = append(raw, 0)
	}

	var iBuf [8]byte
	binary.LittleEndian.PutUint64(iBuf[:], uint64(id))
	raw = append(raw, iBuf[:]...)
	binary.LittleEndian.PutUint64(iBuf[:], uint64(accessHash))
	raw = append(raw, iBuf[:]...)

	// version trailer: [subVersion, version]
	raw = append(raw, 0, 4)

	fileID := base64.RawURLEncoding.EncodeToString(rleEncode(raw))

	parsed, err := tgutils.Parse(fileID)
	if err != nil {
		t.Fatalf("Parse failed: %v", err)
	}

	assertEqual(t, "Id", parsed.Id, id)
	assertEqual(t, "TypeId", parsed.TypeId, tgutils.TypeSticker)
	assertEqual(t, "DcId", parsed.DcId, dcID)
	assertTrue(t, "HasReference", parsed.HasReference)
	assertEqual(t, "Version", parsed.Version, 4)
	assertEqual(t, "SubVersion", parsed.SubVersion, 0)
	assertEqual(t, "Kind", parsed.Kind, kindDocument)
	assertEqual(t, "TypeDetailed", parsed.TypeDetailed, "sticker")
}

func assertEqual[T comparable](t *testing.T, name string, got, want T) {
	t.Helper()

	if got != want {
		t.Errorf("%s = %v, want %v", name, got, want)
	}
}

func assertTrue(t *testing.T, name string, got bool) {
	t.Helper()

	if !got {
		t.Errorf("%s = false, want true", name)
	}
}

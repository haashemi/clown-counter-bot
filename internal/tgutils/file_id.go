package tgutils

import (
	"encoding/base64"
	"encoding/binary"
	"errors"
	"fmt"
	"strings"
)

const (
	typeIDWebLocationFlag   = 1 << 24
	typeIDFileReferenceFlag = 1 << 25
)

const (
	TypeThumbnail                      = 0
	TypeProfilePhoto                   = 1
	TypePhoto                          = 2
	TypeVoice                          = 3
	TypeVideo                          = 4
	TypeDocument                       = 5
	TypeEncrypted                      = 6
	TypeTemp                           = 7
	TypeSticker                        = 8
	TypeAudio                          = 9
	TypeAnimation                      = 10
	TypeEncryptedThumbnail             = 11
	TypeWallpaper                      = 12
	TypeVideoNote                      = 13
	TypeSecureRaw                      = 14
	TypeSecure                         = 15
	TypeBackground                     = 16
	TypeSize                           = 17
	TypeNone                           = 18
	photosizeSourceLegacy              = 0
	photosizeSourceThumbnail           = 1
	photosizeSourceDialogPhotoSmall    = 2
	photosizeSourceDialogPhotoBig      = 3
	photosizeSourceStickersetThumbnail = 4
)

const (
	// base64BlockSize is the byte size of a base64 encoding block.
	base64BlockSize = 4
	// int24Bytes is the byte size of a 24-bit little-endian integer.
	int24Bytes = 3
	// tlStringMaxLength is the largest length a TL string encodes in a single byte.
	tlStringMaxLength = 254
	// tlAlignment is the byte alignment used by TL serialization.
	tlAlignment = 4
	// version4 is the file id version that introduced sub-versions and photosize sources.
	version4 = 4
	// stickerIDOffsetBits is the bit offset of the sticker set id inside the file id.
	stickerIDOffsetBits = 32
	// stickerIDMaskWidth is the bit width of the sticker set id inside the file id.
	stickerIDMaskWidth = 24
)

var (
	errTlStringTooLong     = errors.New("length too big for a single field")
	errUnknownPhotosizeSrc = errors.New("unknown photosize source")
)

func documentTypes() map[int]string {
	return map[int]string{
		TypeVoice:     "voice",
		TypeVideo:     "video",
		TypeDocument:  "document",
		TypeSticker:   "sticker",
		TypeAudio:     "song",
		TypeAnimation: "animation",
		TypeVideoNote: "video note",
	}
}

func photoTypes() map[int]string {
	return map[int]string{
		TypeThumbnail:    "thumbnail",
		TypeProfilePhoto: "profile picture",
		TypePhoto:        "photo",
	}
}

// PhotosizeSource describes the source of a photo size.
type PhotosizeSource struct {
	Type                 string
	VolumeId             int64
	DialogId             int64
	DialogAccessHash     int64
	LocationLocalId      int32
	Secret               int64
	FileType             uint32
	ThumbnailType        string
	StickerSetId         int64
	StickerSetAccessHash int64
}

// ParsedFileId is the result of parsing a Telegram file id.
type ParsedFileId struct {
	FileId         string
	TypeId         int
	HasReference   bool
	HasWebLocation bool
	FileReference  []byte
	DcId           uint32
	Id             int64
	AccessHash     int64
	Version        int
	SubVersion     int

	Kind         string
	TypeGeneric  string
	TypeDetailed string

	Url       string
	Photosize PhotosizeSource
	OwnerId   int64
}

func posMod(a, b int) int {
	rest := a % b
	if rest < 0 {
		rest += abs(b)
	}

	return rest
}

func abs(x int) int {
	if x < 0 {
		return -x
	}

	return x
}

func base64urlDecode(input string) ([]byte, error) {
	base64Str := strings.NewReplacer("-", "+", "_", "/").Replace(input)
	base64Str += strings.Repeat("=", (base64BlockSize-len(base64Str)%base64BlockSize)%base64BlockSize)

	decoded, err := base64.StdEncoding.DecodeString(base64Str)
	if err != nil {
		return nil, fmt.Errorf("decode base64: %w", err)
	}

	return decoded, nil
}

func rleDecode(binaryData []byte) []byte {
	base256 := make([]byte, 0, len(binaryData))

	var last byte

	var hasLast bool

	for _, cur := range binaryData {
		if hasLast && last == 0 {
			for range int(cur) {
				base256 = append(base256, 0)
			}

			hasLast = false

			continue
		}

		if hasLast {
			base256 = append(base256, last)
		}

		last = cur

		hasLast = true
	}

	if hasLast {
		base256 = append(base256, last)
	}

	return base256
}

type binaryReader struct {
	buffer []byte
	pos    int
}

func (r *binaryReader) read(bytes int) []byte {
	chunk := r.buffer[r.pos : r.pos+bytes]
	r.pos += bytes

	return chunk
}

func (r *binaryReader) skip(bytes int) { r.pos += bytes }

func (r *binaryReader) readUInt32LE() uint32 {
	value := binary.LittleEndian.Uint32(r.buffer[r.pos:])
	r.pos += 4

	return value
}

func (r *binaryReader) readInt32LE() int32 {
	value := int32(binary.LittleEndian.Uint32(r.buffer[r.pos:])) // #nosec G115 -- same-size bit reinterpretation
	r.pos += 4

	return value
}

func (r *binaryReader) readBigInt64LE() int64 {
	value := int64(binary.LittleEndian.Uint64(r.buffer[r.pos:])) // #nosec G115 -- same-size bit reinterpretation
	r.pos += 8

	return value
}

func (r *binaryReader) readUInt8() uint8 {
	value := r.buffer[r.pos]
	r.pos++

	return value
}

func readUIntLE24(data []byte) int {
	return int(data[0]) | int(data[1])<<8 | int(data[2])<<16
}

func unpackTlString(r *binaryReader) ([]byte, error) {
	length := int(r.readUInt8())

	if length > tlStringMaxLength {
		return nil, errTlStringTooLong
	}

	var str []byte

	var fill int

	if length == tlStringMaxLength {
		length3 := readUIntLE24(r.read(int24Bytes))
		fill = posMod(-length3, tlAlignment)
		str = r.read(length3)
	} else {
		fill = posMod(-(length + 1), tlAlignment)
		str = r.read(length)
	}

	r.skip(fill)

	return str, nil
}

func unpackNullTerminatedString(input []byte) []byte {
	chars := make([]byte, 0, len(input))

	for _, b := range input {
		if b == 0 {
			break
		}

		chars = append(chars, b)
	}

	return chars
}

func parseVersion(decoded []byte) ([]byte, int, int) {
	if len(decoded) == 0 {
		return nil, 0, 0
	}

	version := int(decoded[len(decoded)-1])
	data := decoded[:len(decoded)-1]
	subVersion := 0

	if version == version4 {
		subVersion = int(data[len(data)-1])
		data = data[:len(data)-1]
	}

	return data, version, subVersion
}

func normalizeTypeId(rawTypeId uint32) (int, bool, bool) {
	hasReference := (rawTypeId & typeIDFileReferenceFlag) != 0
	hasWebLocation := (rawTypeId & typeIDWebLocationFlag) != 0
	typeId := int(rawTypeId &^ typeIDFileReferenceFlag &^ typeIDWebLocationFlag)

	return typeId, hasReference, hasWebLocation
}

func ownerId(id int64, typeId, version int) int64 {
	if (version != 2 && version != version4) || typeId != TypeSticker {
		return 0
	}

	return (id & (((1 << stickerIDMaskWidth) - 1) << stickerIDOffsetBits)) >> stickerIDOffsetBits
}

func parsePhotosize(r *binaryReader, source uint32, volumeId int64) (PhotosizeSource, error) {
	if source == photosizeSourceDialogPhotoSmall || source == photosizeSourceDialogPhotoBig {
		dialogId := r.readBigInt64LE()
		dialogAccessHash := r.readBigInt64LE()
		locationLocalId := r.readInt32LE()

		kind := "dialogPhotoBig"
		if source == photosizeSourceDialogPhotoSmall {
			kind = "dialogPhotoSmall"
		}

		return PhotosizeSource{
			Type:             kind,
			VolumeId:         volumeId,
			DialogId:         dialogId,
			DialogAccessHash: dialogAccessHash,
			LocationLocalId:  locationLocalId,
		}, nil
	}

	switch source {
	case photosizeSourceLegacy:
		return PhotosizeSource{
			Type:            "legacy",
			VolumeId:        volumeId,
			Secret:          r.readBigInt64LE(),
			LocationLocalId: r.readInt32LE(),
		}, nil

	case photosizeSourceThumbnail:
		return PhotosizeSource{
			Type:            "thumbnail",
			VolumeId:        volumeId,
			FileType:        r.readUInt32LE(),
			ThumbnailType:   string(unpackNullTerminatedString(r.read(tlAlignment))),
			LocationLocalId: r.readInt32LE(),
		}, nil

	case photosizeSourceStickersetThumbnail:
		return PhotosizeSource{
			Type:                 "stickersetThumbnail",
			VolumeId:             volumeId,
			StickerSetId:         r.readBigInt64LE(),
			StickerSetAccessHash: r.readBigInt64LE(),
			LocationLocalId:      r.readInt32LE(),
		}, nil

	default:
		return PhotosizeSource{}, fmt.Errorf("%w: %d", errUnknownPhotosizeSrc, source)
	}
}

// Parse parses a Telegram file id and returns the parsed data.
func Parse(raw string) (*ParsedFileId, error) {
	decodedBase64, err := base64urlDecode(raw)
	if err != nil {
		return nil, err
	}

	decoded := rleDecode(decodedBase64)
	data, version, subVersion := parseVersion(decoded)
	reader := &binaryReader{buffer: data}

	rawTypeId := reader.readUInt32LE()
	typeId, hasReference, hasWebLocation := normalizeTypeId(rawTypeId)
	dcId := reader.readUInt32LE()

	var fileReference []byte

	if hasReference {
		fileReference, err = unpackTlString(reader)
		if err != nil {
			return nil, err
		}
	}

	result := &ParsedFileId{
		FileId:         raw,
		TypeId:         typeId,
		HasReference:   hasReference,
		HasWebLocation: hasWebLocation,
		FileReference:  fileReference,
		DcId:           dcId,
		Version:        version,
		SubVersion:     subVersion,
	}

	if hasWebLocation {
		return parseWebLocation(result, reader, typeId)
	}

	result.Id = reader.readBigInt64LE()
	result.AccessHash = reader.readBigInt64LE()

	if photoType, ok := photoTypes()[typeId]; ok {
		return parsePhoto(result, reader, typeId, version, photoType)
	}

	result.Kind = "document"
	result.TypeGeneric = "document"

	if docType, ok := documentTypes()[typeId]; ok {
		result.TypeDetailed = docType
	} else {
		result.TypeDetailed = fmt.Sprintf("unknown(%d)", typeId)
	}

	result.OwnerId = ownerId(result.Id, typeId, version)

	return result, nil
}

func parseWebLocation(result *ParsedFileId, reader *binaryReader, typeId int) (*ParsedFileId, error) {
	url, err := unpackTlString(reader)
	if err != nil {
		return nil, err
	}

	result.Kind = "webLocation"
	result.TypeGeneric = "webLocation"
	result.TypeDetailed = fmt.Sprintf("webLocation(%d)", typeId)
	result.Url = string(url)
	result.AccessHash = reader.readBigInt64LE()

	return result, nil
}

func parsePhoto(result *ParsedFileId, reader *binaryReader, typeId, version int, photoType string) (*ParsedFileId, error) {
	volumeId := reader.readBigInt64LE()
	photosizeSource := uint32(photosizeSourceLegacy)

	if version >= version4 {
		photosizeSource = reader.readUInt32LE()
	}

	photosize, err := parsePhotosize(reader, photosizeSource, volumeId)
	if err != nil {
		return nil, err
	}

	result.Kind = "photo"
	result.TypeGeneric = "photo"
	result.TypeDetailed = photoType
	result.Photosize = photosize
	result.OwnerId = ownerId(result.Id, typeId, version)

	return result, nil
}

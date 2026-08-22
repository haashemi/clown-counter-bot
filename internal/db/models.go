package db

// User is a Telegram user participating in the clown counting.
type User struct {
	ID   int64  `gorm:"column:id;primaryKey"`
	Name string `gorm:"column:name;not null"`
}

func (User) TableName() string { return "users" }

// Group is a Telegram group chat in which the clown counting happens.
type Group struct {
	ID         int64   `gorm:"column:id;primaryKey"`
	Name       string  `gorm:"column:name"`
	GIFIds     *string `gorm:"column:gif_ids"`
	StickerIDs *string `gorm:"column:sticker_ids"`
	ResetAt    *int64  `gorm:"column:reset_at"`
	Cooldown   *int64  `gorm:"column:cooldown"`
}

func (Group) TableName() string { return "groups" }

// ClownVote is a single clown vote recorded in a group.
type ClownVote struct {
	ID      uint   `gorm:"column:id;primaryKey;autoIncrement"`
	VoterID *int64 `gorm:"column:voter_id"`
	ClownID int64  `gorm:"column:clown_id;not null"`
	GroupID int64  `gorm:"column:group_id;not null"`
	VotedAt string `gorm:"column:voted_at;not null"`
}

func (ClownVote) TableName() string { return "clown_votes" }

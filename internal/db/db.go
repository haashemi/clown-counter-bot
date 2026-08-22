package db

import (
	"fmt"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// Open opens the SQLite database at the given path and migrates the schema.
func Open(path string) (*gorm.DB, error) {
	database, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	sqlDB, err := database.DB()
	if err != nil {
		return nil, fmt.Errorf("get database handle: %w", err)
	}
	// SQLite doesn't handle concurrent writers well; serialize all access.
	sqlDB.SetMaxOpenConns(1)

	err = database.AutoMigrate(&User{}, &Group{}, &ClownVote{})
	if err != nil {
		return nil, fmt.Errorf("migrate schema: %w", err)
	}

	return database, nil
}

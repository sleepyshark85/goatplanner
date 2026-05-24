package booking

import (
	"errors"
	"time"
)

type Status string

const StatusApproved Status = "APPROVED"

type Booking struct {
	ID        string
	CourtName string
	TeamName  string
	StartAt   time.Time
	EndAt     time.Time
	Status    Status
	CreatedAt time.Time
}

var ErrInvalidTimeRange = errors.New("end_at must be after start_at")

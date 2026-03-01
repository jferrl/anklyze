package repository

import "errors"

// ErrBufferFull is returned when an async write buffer is full and cannot accept more entries.
var ErrBufferFull = errors.New("buffer full")

// ErrRepositoryClosed is returned when an operation is attempted after Close.
var ErrRepositoryClosed = errors.New("repository closed")

package api

import (
	"encoding/csv"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
)

// newCSVWriter sets the CSV download headers and returns a writer over the
// response. Callers must Flush it.
func newCSVWriter(c *gin.Context, filename string) *csv.Writer {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	return csv.NewWriter(c.Writer)
}

// csvText makes a user-supplied string safe to open in a spreadsheet: a value
// starting with = + - @ tab or CR gets a leading ' so it is not run as a
// formula (OWASP CSV injection). Use it for text columns only, never numbers.
func csvText(s string) string {
	if s != "" && strings.ContainsRune("=+-@\t\r", rune(s[0])) {
		return "'" + s
	}
	return s
}

// csvTextPtr is csvText for an optional value; nil becomes an empty cell.
func csvTextPtr(s *string) string {
	if s == nil {
		return ""
	}
	return csvText(*s)
}

package logger

import "testing"

func TestRedactCredentials(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "JWT token is redacted",
			input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
			want:  "[REDACTED]",
		},
		{
			name:  "Supabase service role key (long base64) is redacted",
			input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
			want:  "[REDACTED]",
		},
		{
			name:  "UUID is NOT redacted",
			input: "user_id=550e8400-e29b-41d4-a716-446655440000",
			want:  "user_id=550e8400-e29b-41d4-a716-446655440000",
		},
		{
			name:  "Short string is unchanged",
			input: "hello world",
			want:  "hello world",
		},
		{
			name:  "Empty string is unchanged",
			input: "",
			want:  "",
		},
		{
			name:  "JWT token embedded in log message",
			input: "authorization header: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U received",
			want:  "authorization header: [REDACTED] received",
		},
		{
			name:  "Classification data with short codes is unchanged",
			input: "classification: supination_adduction, stage: II",
			want:  "classification: supination_adduction, stage: II",
		},
		{
			name:  "Case ID (UUID format) in log message is unchanged",
			input: "case_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890 action=published",
			want:  "case_id=a1b2c3d4-e5f6-7890-abcd-ef1234567890 action=published",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := RedactCredentials(tt.input)
			if got != tt.want {
				t.Errorf("RedactCredentials(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

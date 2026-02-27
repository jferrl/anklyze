package statistics

// ExtractCategories extracts unique categories from rating pairs.
func ExtractCategories(ratings [][2]string) []string {
	seen := make(map[string]bool)
	var categories []string
	for _, pair := range ratings {
		if pair[0] != "" && !seen[pair[0]] {
			seen[pair[0]] = true
			categories = append(categories, pair[0])
		}
		if pair[1] != "" && !seen[pair[1]] {
			seen[pair[1]] = true
			categories = append(categories, pair[1])
		}
	}
	return categories
}

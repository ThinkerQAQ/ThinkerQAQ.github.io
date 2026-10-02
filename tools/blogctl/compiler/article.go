package compiler

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strings"
)

type Article struct {
	Title         string   `json:"title"`
	Description   string   `json:"description"`
	Status        string   `json:"status"`
	Tags          []string `json:"tags"`
	CoverImage    string   `json:"coverImage"`
	CoverImageAlt string   `json:"coverImageAlt"`
	Body          string   `json:"body"`
}

var frontmatterScalarPattern = regexp.MustCompile(`(?m)^([A-Za-z][A-Za-z0-9]*):[ \t]*(.*?)[ \t]*$`)

func parseScalar(raw string) (any, error) {
	value := strings.TrimSpace(raw)
	if value == "" {
		return "", nil
	}
	if strings.HasPrefix(value, `"`) {
		var decoded any
		if err := json.Unmarshal([]byte(value), &decoded); err != nil {
			return nil, err
		}
		return decoded, nil
	}
	if strings.HasPrefix(value, "'") && strings.HasSuffix(value, "'") {
		return strings.ReplaceAll(value[1:len(value)-1], "''", "'"), nil
	}
	switch value {
	case "true":
		return true, nil
	case "false":
		return false, nil
	default:
		return value, nil
	}
}

func frontmatterFields(frontmatter string) map[string]string {
	fields := map[string]string{}
	for _, match := range frontmatterScalarPattern.FindAllStringSubmatch(frontmatter, -1) {
		fields[match[1]] = match[2]
	}
	return fields
}

func readStringScalar(fields map[string]string, name string, required bool) (string, error) {
	raw, ok := fields[name]
	if !ok {
		if required {
			return "", fmt.Errorf("missing %s in article frontmatter", name)
		}
		return "", nil
	}
	value, err := parseScalar(raw)
	if err != nil {
		return "", fmt.Errorf("invalid %s in article frontmatter: %w", name, err)
	}
	text, ok := value.(string)
	if !ok {
		return "", fmt.Errorf("invalid %s in article frontmatter", name)
	}
	return text, nil
}

func readList(frontmatter, name string) ([]string, error) {
	lines := strings.Split(frontmatter, "\n")
	fieldIndex := -1
	prefix := name + ":"
	for index, line := range lines {
		if strings.HasPrefix(line, prefix) {
			fieldIndex = index
			break
		}
	}
	if fieldIndex < 0 {
		return []string{}, nil
	}
	inline := strings.TrimSpace(strings.TrimPrefix(lines[fieldIndex], prefix))
	if inline != "" {
		if strings.HasPrefix(inline, "[") {
			var values []any
			if err := json.Unmarshal([]byte(inline), &values); err != nil {
				return nil, fmt.Errorf("invalid inline %s: %w", name, err)
			}
			result := make([]string, 0, len(values))
			for _, value := range values {
				result = append(result, fmt.Sprint(value))
			}
			return result, nil
		}
		result := []string{}
		for _, raw := range strings.Split(inline, ",") {
			value, err := parseScalar(raw)
			if err != nil {
				return nil, fmt.Errorf("invalid inline %s: %w", name, err)
			}
			text := fmt.Sprint(value)
			if text != "" {
				result = append(result, text)
			}
		}
		return result, nil
	}

	result := []string{}
	for _, line := range lines[fieldIndex+1:] {
		trimmed := strings.TrimSpace(line)
		if !strings.HasPrefix(trimmed, "- ") {
			break
		}
		value, err := parseScalar(strings.TrimSpace(strings.TrimPrefix(trimmed, "- ")))
		if err != nil {
			return nil, fmt.Errorf("invalid %s: %w", name, err)
		}
		result = append(result, fmt.Sprint(value))
	}
	return result, nil
}

func ParseArticle(markdown, source string) (Article, error) {
	normalized := strings.TrimPrefix(strings.ReplaceAll(markdown, "\r\n", "\n"), "\ufeff")
	if !strings.HasPrefix(normalized, "---\n") {
		return Article{}, fmt.Errorf("invalid article frontmatter: %s", source)
	}
	rest := normalized[len("---\n"):]
	end := strings.Index(rest, "\n---\n")
	markerLength := len("\n---\n")
	if end < 0 && strings.HasSuffix(rest, "\n---") {
		end = len(rest) - len("\n---")
		markerLength = len("\n---")
	}
	if end < 0 {
		return Article{}, fmt.Errorf("invalid article frontmatter: %s", source)
	}
	frontmatter := rest[:end]
	after := rest[end+markerLength:]
	fields := frontmatterFields(frontmatter)

	title, err := readStringScalar(fields, "title", true)
	if err != nil {
		return Article{}, err
	}
	description, err := readStringScalar(fields, "description", true)
	if err != nil {
		return Article{}, err
	}
	status, err := readStringScalar(fields, "status", false)
	if err != nil {
		return Article{}, err
	}
	if status == "" {
		status = "draft"
	}
	coverImage, err := readStringScalar(fields, "coverImage", false)
	if err != nil {
		return Article{}, err
	}
	coverImageAlt, err := readStringScalar(fields, "coverImageAlt", false)
	if err != nil {
		return Article{}, err
	}
	tags, err := readList(frontmatter, "tags")
	if err != nil {
		return Article{}, err
	}
	body := strings.TrimSpace(after)

	if strings.TrimSpace(title) == "" {
		return Article{}, fmt.Errorf("invalid title: %s", source)
	}
	if strings.TrimSpace(description) == "" {
		return Article{}, fmt.Errorf("invalid description: %s", source)
	}
	if body == "" {
		return Article{}, fmt.Errorf("article body is empty: %s", source)
	}
	if status == "published" && (coverImage == "" || coverImageAlt == "") {
		return Article{}, fmt.Errorf("published article cover metadata is incomplete: %s", source)
	}
	if strings.ContainsRune(title, '\x00') || strings.ContainsRune(description, '\x00') {
		return Article{}, errors.New("article metadata contains NUL")
	}

	return Article{
		Title: title, Description: description, Status: status, Tags: tags,
		CoverImage: coverImage, CoverImageAlt: coverImageAlt, Body: body,
	}, nil
}

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
)

func getMetrics() map[string]interface{} {
	metrics := make(map[string]interface{})

	cmd := exec.Command("rec_control", "get-all")
	out, err := cmd.Output()
	if err != nil {
		metrics["error"] = err.Error()
		return metrics
	}

	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	raw := make(map[string]float64)

	for scanner.Scan() {
		line := strings.Fields(scanner.Text())
		if len(line) < 2 {
			continue
		}
		if f, err := strconv.ParseFloat(line[1], 64); err == nil {
			raw[line[0]] = f
		}
	}

	cacheHits := raw["cache-hits"]
	cacheMisses := raw["cache-misses"]
	packetHits := raw["packetcache-hits"]
	packetMisses := raw["packetcache-misses"]

	cacheRatio := 0.0
	if cacheHits+cacheMisses > 0 {
		cacheRatio = (cacheHits / (cacheHits + cacheMisses)) * 100
	}
	packetRatio := 0.0
	if packetHits+packetMisses > 0 {
		packetRatio = (packetHits / (packetHits + packetMisses)) * 100
	}

	metrics["uptime"] = raw["uptime"]
	metrics["questions"] = raw["questions"]
	metrics["concurrent_queries"] = raw["concurrent-queries"]
	metrics["cache_hits"] = cacheHits
	metrics["cache_misses"] = cacheMisses
	metrics["cache_ratio"] = cacheRatio
	metrics["packetcache_hits"] = packetHits
	metrics["packetcache_misses"] = packetMisses
	metrics["packetcache_ratio"] = packetRatio
	metrics["servfail"] = raw["servfail-answers"]
	metrics["nxdomain"] = raw["nxdomain-answers"]
	metrics["outgoing_timeouts"] = raw["outgoing-timeouts"]
	metrics["latency"] = raw["qa-latency"]
	metrics["memory_bytes"] = raw["real-memory-usage"]
	metrics["fd_usage"] = raw["fd-usage"]
	metrics["tcp_clients"] = raw["tcp-clients"]
	metrics["security_status"] = raw["security-status"]

	return metrics
}

func getTopQueries() []interface{} {
	cmd := exec.Command("rec_control", "top-queries")
	out, err := cmd.Output()
	if err != nil {
		return []interface{}{map[string]string{"error": err.Error()}}
	}

	result := []interface{}{}
	scanner := bufio.NewScanner(strings.NewReader(string(out)))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.Contains(line, "entries:") || strings.Contains(line, "rest") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		percentageStr := strings.TrimSuffix(parts[0], "%")
		percentage, _ := strconv.ParseFloat(percentageStr, 64)

		// The rest of the line is "domain|TYPE"
		query := strings.Join(parts[1:], " ")

		result = append(result, map[string]interface{}{
			"percentage": percentage,
			"query":      query,
		})
	}

	return result
}

func getTopRemotes() []interface{} {
	cmd := exec.Command("rec_control", "top-remotes")
	out, err := cmd.Output()
	if err != nil {
		return []interface{}{map[string]string{"error": err.Error()}}
	}

	result := []interface{}{}
	scanner := bufio.NewScanner(strings.NewReader(string(out)))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.Contains(line, "entries:") || strings.Contains(line, "rest") {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) < 2 {
			continue
		}

		percentageStr := strings.TrimSuffix(parts[0], "%")
		percentage, _ := strconv.ParseFloat(percentageStr, 64)

		result = append(result, map[string]interface{}{
			"percentage": percentage,
			"ip":         parts[1],
		})
	}

	return result
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	metrics := getMetrics()
	metrics["top_queries"] = getTopQueries()
	metrics["top_remotes"] = getTopRemotes()

	json.NewEncoder(w).Encode(metrics)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func main() {
	http.HandleFunc("/stats", statsHandler)
	http.HandleFunc("/health", healthHandler)

	fmt.Println("PDNS Exporter listening on :9000")
	log.Fatal(http.ListenAndServe(":9000", nil))
}

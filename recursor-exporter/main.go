package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"math"
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

// parseTopOutput runs rec_control <cmd> and parses:
//   "Over last <N> entries:" header
//   "<pct>%   <value>" lines per entry
// Returns totalEntries, and a slice of map containing percentage + raw count + value.
func parseTopOutput(cmdName string) (int, []interface{}) {
	cmd := exec.Command("rec_control", cmdName)
	out, err := cmd.Output()
	if err != nil {
		return 0, []interface{}{map[string]string{"error": err.Error()}}
	}

	result := []interface{}{}
	totalEntries := 0
	scanner := bufio.NewScanner(strings.NewReader(string(out)))

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}

		// Parse "Over last 12500 entries:" header
		if strings.Contains(line, "entries:") && strings.Contains(line, "Over last") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				totalEntries, _ = strconv.Atoi(parts[2])
			}
			continue
		}

		// Skip "rest" line
		if strings.Contains(line, "rest") {
			continue
		}

		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}

		pctStr := strings.TrimSuffix(fields[0], "%")
		pct, _ := strconv.ParseFloat(pctStr, 64)

		count := int(math.Round(pct * float64(totalEntries) / 100.0))

		if cmdName == "top-queries" {
			query := strings.Join(fields[1:], " ")
			result = append(result, map[string]interface{}{
				"percentage": pct,
				"count":      count,
				"query":      query,
			})
		} else {
			result = append(result, map[string]interface{}{
				"percentage": pct,
				"count":      count,
				"ip":         fields[1],
			})
		}
	}

	return totalEntries, result
}

func getTopQueries() (int, []interface{}) {
	return parseTopOutput("top-queries")
}

func getTopRemotes() (int, []interface{}) {
	return parseTopOutput("top-remotes")
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	metrics := getMetrics()

	qEntries, qData := getTopQueries()
	rEntries, rData := getTopRemotes()

	metrics["top_queries_total_entries"] = qEntries
	metrics["top_queries"] = qData
	metrics["top_remotes_total_entries"] = rEntries
	metrics["top_remotes"] = rData

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

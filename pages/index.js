import { useState, useEffect } from "react";
import styles from "../styles/Home.module.css";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { db, ref, set, remove, get } from "../firebase";
import { v4 as uuidv4 } from "uuid"; // for unique task IDs

export default function Home() {
  const [task, setTask] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  // Fetch history from Firebase on load
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const snapshot = await get(ref(db, "tasks"));
        if (snapshot.exists()) {
          const data = snapshot.val();
          const tasks = Object.values(data);
          setHistory(tasks.slice(-5)); // latest 5 tasks
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
      }
    };
    fetchTasks();
  }, []);

  // Submit task and save to Firebase
  const handleSubmit = async () => {
    if (!task.trim()) {
      setError("Please enter a task first");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/ai", { task });
      const suggestionText = res.data.suggestion;

      setSuggestion(suggestionText);

      const taskId = uuidv4(); // unique ID for each task
      const taskData = {
        task,
        suggestion: suggestionText,
        timestamp: new Date().toISOString(),
      };

      // Save to Firebase
      await set(ref(db, "tasks/" + taskId), taskData);

      const newHistory = [...history, taskData].slice(-5);
      setHistory(newHistory);
    } catch (err) {
      setError("Failed to get suggestion. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && e.ctrlKey) handleSubmit();
  };

  const clearHistory = async () => {
    setHistory([]);
    await remove(ref(db, "tasks"));
  };

  return (
    <div className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          🧠 PlanWise <span className={styles.subtitle}>Smart Task Planner</span>
        </h1>
      </header>

      <main className={styles.container}>
        <div className={styles.inputSection}>
          <textarea
            className={styles.textarea}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your task here... (Ctrl + Enter to submit)"
            rows={4}
          />

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.buttonRow}>
            <button
              className={styles.button}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className={styles.loader}></div>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>🔍 Get Suggestion</>
              )}
            </button>
          </div>
        </div>

        {suggestion && (
          <div className={styles.suggestionBox}>
            <h3 className={styles.suggestionTitle}>💡 Suggestion:</h3>
            <ReactMarkdown
              components={{
                ul: ({ node, ...props }) => (
                  <ul style={{ paddingLeft: 20, marginBottom: 0 }} {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li style={{ marginBottom: 4 }} {...props} />
                ),
              }}
            >
              {suggestion}
            </ReactMarkdown>
          </div>
        )}

        {history.length > 0 && (
          <div className={styles.historySection}>
            <div className={styles.historyHeader}>
              <h3>Previous Tasks</h3>
              <button onClick={clearHistory} className={styles.clearButton}>
                Clear History
              </button>
            </div>
            {history.map((item, index) => (
              <div key={index} className={styles.historyItem}>
                <p className={styles.historyTask}>{item.task}</p>
                <ReactMarkdown
                  components={{
                    ul: ({ node, ...props }) => (
                      <ul style={{ paddingLeft: 20, marginBottom: 0 }} {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li style={{ marginBottom: 4 }} {...props} />
                    ),
                  }}
                >
                  {item.suggestion}
                </ReactMarkdown>
                <small className={styles.timestamp}>
                  {new Date(item.timestamp).toLocaleString()}
                </small>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
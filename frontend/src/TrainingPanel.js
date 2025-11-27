import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TrainingPanel({ isOpen, onClose }) {
  const [feedback, setFeedback] = useState({
    type: 'rating',
    round: 1,
    motion: '',
    rating: 5,
    comment: '',
    suggestion: ''
  });
  const [analysis, setAnalysis] = useState(null);
  const [exportPath, setExportPath] = useState(null);

  const submitFeedback = async () => {
    try {
      await axios.post('http://localhost:3001/feedback', feedback);
      alert('Feedback submitted successfully!');
      setFeedback({ ...feedback, comment: '', suggestion: '' });
    } catch (error) {
      alert('Failed to submit feedback');
    }
  };

  const getAnalysis = async () => {
    try {
      const response = await axios.get('http://localhost:3001/training-analysis');
      setAnalysis(response.data);
    } catch (error) {
      alert('Failed to get analysis');
    }
  };

  const exportData = async () => {
    try {
      const response = await axios.get('http://localhost:3001/export-training-data');
      setExportPath(response.data.exportPath);
      alert('Training data exported successfully!');
    } catch (error) {
      alert('Failed to export training data');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="training-panel-overlay">
      <div className="training-panel">
        <div className="training-header">
          <h2>AI Training & Improvement</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="training-content">
          <div className="feedback-section">
            <h3>Provide Feedback</h3>
            <div className="feedback-form">
              <select
                value={feedback.type}
                onChange={e => setFeedback({...feedback, type: e.target.value})}
              >
                <option value="rating">Rate Response</option>
                <option value="comment">General Comment</option>
                <option value="suggestion">Improvement Suggestion</option>
              </select>

              <input
                type="number"
                min="1"
                max="5"
                value={feedback.rating}
                onChange={e => setFeedback({...feedback, rating: parseInt(e.target.value)})}
                placeholder="Rating (1-5)"
              />

              <textarea
                value={feedback.comment}
                onChange={e => setFeedback({...feedback, comment: e.target.value})}
                placeholder="What did you think of the AI's response?"
                rows="3"
              />

              <textarea
                value={feedback.suggestion}
                onChange={e => setFeedback({...feedback, suggestion: e.target.value})}
                placeholder="How can the AI improve?"
                rows="3"
              />

              <button onClick={submitFeedback}>Submit Feedback</button>
            </div>
          </div>

          <div className="analysis-section">
            <h3>Training Analysis</h3>
            <button onClick={getAnalysis}>Generate Analysis</button>

            {analysis && (
              <div className="analysis-results">
                <p><strong>Average Rating:</strong> {analysis.averageRating?.toFixed(1)}/5</p>
                <p><strong>Common Issues:</strong></p>
                <ul>
                  {Object.entries(analysis.commonIssues || {}).map(([issue, count]) => (
                    <li key={issue}>{issue}: {count} mentions</li>
                  ))}
                </ul>
                <p><strong>Improvement Areas:</strong></p>
                <ul>
                  {analysis.improvementAreas?.map((area, i) => (
                    <li key={i}>{area}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="export-section">
            <h3>Data Export</h3>
            <button onClick={exportData}>Export Training Data</button>
            {exportPath && (
              <p className="export-path">Data exported to: {exportPath}</p>
            )}
            <p className="export-info">
              Export data can be used for fine-tuning models on platforms like OpenAI or Hugging Face.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainingPanel;

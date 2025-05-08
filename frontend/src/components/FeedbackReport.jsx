import React from 'react';

const FeedbackReport = ({ templates, onClose }) => {
    // Mock feedback data (replace with API call to fetch sessions)
    const sessions = templates.map(template => ({
        template_id: template.id,
        transcript: [{ role: 'user', content: 'Yeh product kitna reliable hai?' }, { role: 'assistant', content: 'Bohot reliable hai, bhai!' }],
        feedback: { score: 0.8, details: { "Mention warranty": "Achieved", "Follow-up": "Not booked" } }
    }));

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">Feedback Reports</h2>
                {sessions.map((session, index) => (
                    <div key={index} className="mb-4 p-4 bg-gray-50 rounded">
                        <h3 className="text-lg font-semibold">Template ID: {session.template_id}</h3>
                        <p><strong>Score:</strong> {session.feedback.score}</p>
                        <p><strong>Details:</strong></p>
                        <ul className="list-disc pl-5">
                            {Object.entries(session.feedback.details).map(([key, value]) => (
                                <li key={key}>{key}: {value}</li>
                            ))}
                        </ul>
                    </div>
                ))}
                <div className="flex justify-end">
                    <button
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FeedbackReport;
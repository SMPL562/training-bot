import React, { useState, useEffect } from 'react';
import RoleplayCard from './components/RoleplayCard';
import TemplateForm from './components/TemplateForm';
import TeamManagement from './components/TeamManagement';
import FeedbackReport from './components/FeedbackReport';
import ChatInterface from './components/ChatInterface';
import axios from 'axios';
import './App.css';

const App = () => {
    const [templates, setTemplates] = useState([]);
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showTemplateForm, setShowTemplateForm] = useState(false);
    const [showTeamManagement, setShowTeamManagement] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);

    useEffect(() => {
        // Fetch templates, teams, and users
        const fetchData = async () => {
            try {
                const [templatesRes, teamsRes, usersRes] = await Promise.all([
                    axios.get('http://localhost:8000/templates'),
                    axios.get('http://localhost:8000/teams'),
                    axios.get('http://localhost:8000/users')
                ]);
                setTemplates(templatesRes.data);
                setTeams(teamsRes.data);
                setUsers(usersRes.data);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    const handleTemplateSubmit = async (template) => {
        try {
            const response = await axios.post('http://localhost:8000/templates', template);
            setTemplates([...templates, { id: response.data.id, ...template }]);
            setShowTemplateForm(false);
        } catch (error) {
            console.error('Error creating template:', error);
        }
    };

    const handleTeamSubmit = async (team) => {
        try {
            const response = await axios.post('http://localhost:8000/teams', team);
            setTeams([...teams, { id: response.data.id, ...team }]);
            setShowTeamManagement(false);
        } catch (error) {
            console.error('Error creating team:', error);
        }
    };

    const handleUserSubmit = async (user) => {
        try {
            const response = await axios.post('http://localhost:8000/users', user);
            setUsers([...users, { id: response.data.id, ...user }]);
            setShowTeamManagement(false);
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6 text-center">Hinglish Conversational AI</h1>
            <div className="flex justify-center space-x-4 mb-6">
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    onClick={() => setShowTemplateForm(true)}
                >
                    Create Template
                </button>
                <button
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    onClick={() => setShowTeamManagement(true)}
                >
                    Manage Teams
                </button>
                <button
                    className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                    onClick={() => setShowFeedback(true)}
                >
                    View Feedback
                </button>
            </div>

            {showTemplateForm && (
                <TemplateForm onSubmit={handleTemplateSubmit} onClose={() => setShowTemplateForm(false)} />
            )}
            {showTeamManagement && (
                <TeamManagement
                    teams={teams}
                    users={users}
                    onTeamSubmit={handleTeamSubmit}
                    onUserSubmit={handleUserSubmit}
                    onClose={() => setShowTeamManagement(false)}
                />
            )}
            {showFeedback && (
                <FeedbackReport templates={templates} onClose={() => setShowFeedback(false)} />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {templates.map(template => (
                    <RoleplayCard
                        key={template.id}
                        template={template}
                        onSelect={() => setSelectedTemplate(template)}
                    />
                ))}
            </div>

            {selectedTemplate && (
                <ChatInterface templateId={selectedTemplate.id} onClose={() => setSelectedTemplate(null)} />
            )}
        </div>
    );
};

export default App;
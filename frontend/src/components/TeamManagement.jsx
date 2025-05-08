import React, { useState } from 'react';

const TeamManagement = ({ teams, users, onTeamSubmit, onUserSubmit, onClose }) => {
    const [teamForm, setTeamForm] = useState({ name: '', members: [] });
    const [userForm, setUserForm] = useState({ name: '', role: '', team_id: '' });

    const handleTeamChange = (e) => {
        const { name, value } = e.target;
        setTeamForm(prev => ({ ...prev, [name]: value }));
    };

    const handleUserChange = (e) => {
        const { name, value } = e.target;
        setUserForm(prev => ({ ...prev, [name]: value }));
    };

    const handleTeamSubmit = (e) => {
        e.preventDefault();
        onTeamSubmit({ ...teamForm, members: teamForm.members.split(',').map(id => parseInt(id.trim())) });
        setTeamForm({ name: '', members: [] });
    };

    const handleUserSubmit = (e) => {
        e.preventDefault();
        onUserSubmit({ ...userForm, team_id: parseInt(userForm.team_id) });
        setUserForm({ name: '', role: '', team_id: '' });
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Manage Teams</h2>
                <h3 className="text-lg font-semibold mb-2">Create Team</h3>
                <form onSubmit={handleTeamSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Team Name</label>
                        <input
                            type="text"
                            name="name"
                            value={teamForm.name}
                            onChange={handleTeamChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Member IDs (comma-separated)</label>
                        <input
                            type="text"
                            name="members"
                            value={teamForm.members}
                            onChange={handleTeamChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Create Team
                    </button>
                </form>
                <h3 className="text-lg font-semibold mt-4 mb-2">Create User</h3>
                <form onSubmit={handleUserSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">User Name</label>
                        <input
                            type="text"
                            name="name"
                            value={userForm.name}
                            onChange={handleUserChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Role</label>
                        <select
                            name="role"
                            value={userForm.role}
                            onChange={handleUserChange}
                            className="w-full p-2 border rounded"
                            required
                        >
                            <option value="">Select Role</option>
                            <option value="admin">Admin</option>
                            <option value="manager">Manager</option>
                            <option value="sales_rep">Sales Rep</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Team ID</label>
                        <input
                            type="number"
                            name="team_id"
                            value={userForm.team_id}
                            onChange={handleUserChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                        Create User
                    </button>
                </form>
                <div className="flex justify-end mt-4">
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

export default TeamManagement;
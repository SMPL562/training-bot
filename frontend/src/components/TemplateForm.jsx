import React, { useState } from 'react';

const TemplateForm = ({ onSubmit, onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        call_context: '',
        goals: [],
        objections: [],
        persona: { name: '', job_title: '', demeanor: '' }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('persona.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                persona: { ...prev.persona, [field]: value }
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleArrayChange = (e, field) => {
        const values = e.target.value.split(',').map(v => v.trim());
        setFormData(prev => ({ ...prev, [field]: values }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Create Template</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Call Context</label>
                        <textarea
                            name="call_context"
                            value={formData.call_context}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Goals (comma-separated)</label>
                        <input
                            type="text"
                            onChange={(e) => handleArrayChange(e, 'goals')}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Objections (comma-separated)</label>
                        <input
                            type="text"
                            onChange={(e) => handleArrayChange(e, 'objections')}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Persona Name</label>
                        <input
                            type="text"
                            name="persona.name"
                            value={formData.persona.name}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Persona Job Title</label>
                        <input
                            type="text"
                            name="persona.job_title"
                            value={formData.persona.job_title}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium">Persona Demeanor</label>
                        <input
                            type="text"
                            name="persona.demeanor"
                            value={formData.persona.demeanor}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button
                            type="button"
                            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TemplateForm;
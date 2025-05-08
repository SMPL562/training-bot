import React from 'react';

const RoleplayCard = ({ template, onSelect }) => {
    return (
        <div
            className="p-4 bg-white rounded-lg shadow-md cursor-pointer hover:bg-gray-100"
            onClick={onSelect}
        >
            <h3 className="text-xl font-semibold">{template.title}</h3>
            <p className="text-gray-600">{template.call_context}</p>
            <p className="text-sm text-gray-500 mt-2">Goals: {template.goals.join(', ')}</p>
        </div>
    );
};

export default RoleplayCard;
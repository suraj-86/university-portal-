import React from 'react';
import { FileText, Download } from 'lucide-react';
import { getFileUrl } from '../services/api';

const AttachmentBadge = ({ fileUrl, fileName, color = "indigo" }) => {
    
    const handleDownload = (e) => {
        e.stopPropagation();
        if (!fileUrl && !fileName) return alert("No attachment path found.");
        
        const path = fileUrl || fileName;
        window.open(getFileUrl(path), '_blank');
    };

    const colorClasses = {
        indigo: "text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100",
        blue: "text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100",
        emerald: "text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100"
    };

    return (
        <button 
            onClick={handleDownload}
            className={`flex items-center gap-2 text-[10px] font-bold ${colorClasses[color]} w-fit px-3 py-1.5 rounded-lg border transition-all cursor-pointer group`}
        >
            <FileText size={12} className="group-hover:scale-110 transition-transform" />
            <span>{fileName ? fileName.replace('/uploads/', '') : fileUrl.replace('/uploads/', '')}</span>
            <Download size={10} className="ml-1 opacity-50" />
        </button>
    );
};

export default AttachmentBadge;
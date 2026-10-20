import React from 'react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import useLoad from '../../hooks/useLoad';
import { LoadState } from '../../components/admin/ListParts';
import ProfileView from '../../components/profile/ProfileView';

const StudentProfile = () => {
    const { user } = useAuth();
    const urls = user?.id ? [`/student/${user.id}/profile`] : [];
    return <Inner key={user?.id} urls={urls} userId={user?.id} />;
};

const Inner = ({ urls, userId }) => {
    const { data, loading, error, reload } = useLoad(urls);
    if (!userId) return null;
    if (!data) return <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen"><LoadState loading={loading} error={error} onRetry={reload} /></div>;
    const save = async (payload) => {
        await api.put(`/student/${userId}/profile`, payload);
        toast.success('Your details were updated.');
        reload();
    };
    return <ProfileView data={data[0]} title="Profile" subtitle="Your details on record with the university." canEdit onSave={save} />;
};

export default StudentProfile;

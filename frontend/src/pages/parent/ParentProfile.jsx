import React from 'react';
import useAuth from '../../hooks/useAuth';
import useWards from '../../hooks/useWards';
import useLoad from '../../hooks/useLoad';
import { LoadState } from '../../components/admin/ListParts';
import WardSwitcher from '../../components/parent/WardSwitcher';
import ProfileView from '../../components/profile/ProfileView';

const Page = ({ children }) => <div className="p-6 md:p-10 bg-slate-50 dark:bg-slate-950 min-h-screen font-sans">{children}</div>;

const WardProfile = ({ ward, switcher }) => {
    const { data, loading, error, reload } = useLoad([`/student/${ward.user_id}/profile`]);
    if (!data) return <Page>{switcher}<LoadState loading={loading} error={error} onRetry={reload} /></Page>;
    return <ProfileView data={data[0]} title="Ward profile" subtitle={`Details on record for ${ward.full_name}.`} switcher={switcher} />;
};

const ParentProfile = () => {
    const { user } = useAuth();
    const { wards, current, loading, error, select } = useWards(user?.id);
    if (loading) return <Page><p className="py-10 text-slate-400 font-bold animate-pulse">Loading ward profile…</p></Page>;
    if (error) return <Page><p className="py-10 text-rose-600 dark:text-rose-400 font-bold">{error}</p></Page>;
    if (!current) return <Page><p className="py-10 text-slate-500 dark:text-slate-400 font-bold">No active students are currently linked to your parent account.</p></Page>;
    const switcher = <WardSwitcher wards={wards} currentId={current.student_id} onChange={select} />;
    return <WardProfile key={current.user_id} ward={current} switcher={switcher} />;
};

export default ParentProfile;

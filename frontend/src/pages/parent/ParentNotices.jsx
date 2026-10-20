import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import NoticeFeed from '../../components/notices/NoticeFeed';
import WardSwitcher from '../../components/parent/WardSwitcher';

const ParentNotices = () => {
    const { user } = useAuth();
    const [wards, setWards] = useState([]);
    const [wardId, setWardId] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        api.get(`/parent/${user.id}/wards-overview`)
            .then((res) => setWards(res.data?.allWards || []))
            .catch(() => setWards([]));
    }, [user]);

    return (
        <NoticeFeed
            title="Campus Notices"
            subtitle="Official announcements about your ward, and messages from faculty to you."
            params={wardId ? { student_id: wardId } : {}}
            topSlot={<WardSwitcher wards={wards} currentId={wardId} onChange={setWardId} allLabel="All my children" label="Notices for" />}
        />
    );
};

export default ParentNotices;

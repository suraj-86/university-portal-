import React from 'react';
import useAuth from '../../hooks/useAuth';
import WardDashboard from '../../components/dashboard/WardDashboard';

const StudentDashboard = () => {
    const { user } = useAuth();
    return <WardDashboard studentUserId={user?.id} base="/student" greetingName={(user?.full_name || 'there').split(' ')[0]} subject="You" />;
};

export default StudentDashboard;

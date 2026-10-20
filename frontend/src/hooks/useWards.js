import { useEffect, useState } from 'react';
import api from '../services/api';

const useWards = (parentUserId) => {
    const [selected, setSelected] = useState('');
    const key = `${parentUserId}:${selected}`;
    const [state, setState] = useState({ key: null, wards: [], current: null, error: '' });

    useEffect(() => {
        if (!parentUserId) return undefined;
        let cancelled = false;
        api.get(`/parent/${parentUserId}/wards-overview${selected ? `?student_id=${selected}` : ''}`)
            .then((r) => { if (!cancelled) setState({ key, wards: r.data.allWards || [], current: r.data.childProfile || null, error: '' }); })
            .catch((e) => { if (!cancelled) setState({ key, wards: [], current: null, error: e.response?.data?.error || 'Ward information could not be loaded.' }); });
        return () => { cancelled = true; };
    }, [parentUserId, selected, key]);

    return { ...state, loading: !!parentUserId && state.key !== key && !state.current, select: setSelected };
};

export default useWards;

import { useEffect, useState } from 'react';
import api from '../services/api';

const useLoad = (urls) => {
    const urlKey = urls.join('|');
    const [attempt, setAttempt] = useState(0);
    const key = `${urlKey}#${attempt}`;
    const [state, setState] = useState({ key: null, data: null, error: '' });

    useEffect(() => {
        let cancelled = false;
        Promise.all(urlKey.split('|').map((u) => api.get(u)))
            .then((rs) => { if (!cancelled) setState({ key, data: rs.map((r) => r.data), error: '' }); })
            .catch((e) => { if (!cancelled) setState((s) => ({ key, data: s.data, error: e.response?.data?.error || 'Could not load this page.' })); });
        return () => { cancelled = true; };
    }, [urlKey, key]);

    return {
        data: state.data,
        loading: state.data === null && !state.error,
        error: state.data === null ? state.error : '',
        reload: () => setAttempt((n) => n + 1)
    };
};

export default useLoad;

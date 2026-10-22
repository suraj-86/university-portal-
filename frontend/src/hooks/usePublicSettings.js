import { useEffect, useState } from 'react';
import api from '../services/api';

const usePublicSettings = () => {
    const [settings, setSettings] = useState({ onlinePayments: false, loaded: false });
    useEffect(() => {
        let cancelled = false;
        api.get('/settings/public')
            .then((r) => { if (!cancelled) setSettings({ onlinePayments: !!r.data.onlinePayments, loaded: true }); })
            .catch(() => { if (!cancelled) setSettings({ onlinePayments: false, loaded: true }); });
        return () => { cancelled = true; };
    }, []);
    return settings;
};

export default usePublicSettings;

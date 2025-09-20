import type { KollelDetails, MonthlyData, StipendSettings } from '../types';

/**
 * Checks if the app is running in an environment that should use localStorage.
 * This is a simple check for being inside an iframe, typical for platforms like AI Studio.
 * @returns {boolean} True if it's likely an iframe environment, false otherwise.
 */
const isStudioEnv = (): boolean => {
    // For development, always use the server API - no exceptions
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('🔧 API Service - Running on localhost, using server API');
        return false;
    }

    // For production deployments, check iframe status
    try {
        const isInIframe = window.self !== window.top;
        console.log('🔧 API Service - Production environment, in iframe:', isInIframe);
        return isInIframe;
    } catch (e) {
        console.log('🔧 API Service - Cross-origin error detected, assuming iframe environment');
        return true;
    }
};

// Use relative URL - Vite proxy will route /api/* to backend server
const API_BASE_URL = '/api';
console.log('🔧 API Service - Using proxy-based API_BASE_URL:', API_BASE_URL);

// --- LocalStorage specific helpers ---

const saveAllKollels_LS = (kollels: KollelDetails[]): void => {
    try {
        localStorage.setItem('kollelsList', JSON.stringify(kollels));
    } catch (e) {
        console.error("Failed to save kollels to localStorage", e);
    }
};

const saveAllData_LS = (kollelId: string, allData: MonthlyData[]): void => {
    try {
        localStorage.setItem(`savedData_${kollelId}`, JSON.stringify(allData));
    } catch (e) {
        console.error(`Failed to save data for kollel ${kollelId} to localStorage`, e);
    }
};

// --- Kollel Management API ---

/**
 * Fetches the list of all kollels.
 * Uses localStorage in Studio Env, otherwise it's a server placeholder.
 */
export const getKollels = async (): Promise<KollelDetails[]> => {
    const studioEnv = isStudioEnv();
    console.log('🔍 getKollels Debug Info:', {
        isStudioEnv: studioEnv,
        apiBaseUrl: API_BASE_URL,
        hostname: window.location.hostname,
        href: window.location.href
    });

    if (studioEnv) {
        console.log('API: Using localStorage for getKollels');
        try {
            const savedKollels = localStorage.getItem('kollelsList');
            return savedKollels ? JSON.parse(savedKollels) : [];
        } catch (error) {
            console.error("Failed to parse kollels list from localStorage", error);
            return [];
        }
    } else {
        // SERVER-SIDE IMPLEMENTATION
        console.log('API: Fetching kollels from server...');
        console.log('🌐 Making request to:', `${API_BASE_URL}/kollels`);
        try {
            const response = await fetch(`${API_BASE_URL}/kollels`);
            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Response error text:', errorText);
                throw new Error(`Failed to fetch kollels: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('✅ Successful response data:', data);

            // Transform MongoDB _id to id for frontend compatibility
            const transformedData = data.map((kollel: any) => ({
                ...kollel,
                id: kollel._id,
                // Remove _id to avoid confusion
                _id: undefined
            }));

            console.log('🔄 Transformed data with proper IDs:', transformedData);
            return transformedData;
        } catch (error) {
            console.error('Failed to fetch kollels from server:', error);
            throw error;
        }
    }
};

/**
 * Adds a new kollel.
 */
export const addKollel = async (kollelData: { name: string; managerName?: string; phone?: string; address?: string; settings: StipendSettings }): Promise<KollelDetails> => {
    const newKollel: KollelDetails = {
        id: Date.now().toString(),
        ...kollelData
    };

    if (isStudioEnv()) {
        console.log('API: Using localStorage for addKollel');
        const kollels = await getKollels();
        const updatedKollels = [...kollels, newKollel];
        saveAllKollels_LS(updatedKollels);
        return newKollel;
    } else {
        // SERVER-SIDE IMPLEMENTATION
        console.log('API: Adding kollel on server...');
        try {
            const response = await fetch(`${API_BASE_URL}/kollels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(kollelData),
            });
            if (!response.ok) throw new Error('Failed to add kollel');

            const responseData = await response.json();
            console.log('✅ Add kollel response:', responseData);

            // Transform response data _id to id
            const transformedResponse = {
                ...responseData,
                id: responseData._id,
                _id: undefined
            };

            console.log('🔄 Transformed add response:', transformedResponse);
            return transformedResponse;
        } catch (error) {
            console.error('Failed to add kollel on server:', error);
            throw error;
        }
    }
};

/**
 * Updates an existing kollel.
 */
export const updateKollel = async (updatedKollel: KollelDetails): Promise<KollelDetails> => {
    if (isStudioEnv()) {
        console.log('API: Using localStorage for updateKollel');
        const kollels = await getKollels();
        const updatedKollels = kollels.map(k => k.id === updatedKollel.id ? updatedKollel : k);
        saveAllKollels_LS(updatedKollels);
        return updatedKollel;
    } else {
        // SERVER-SIDE IMPLEMENTATION
        console.log(`API: Updating kollel ${updatedKollel.id} on server...`);
        try {
            // Prepare data for backend - remove id and let MongoDB handle _id
            const { id, ...dataForBackend } = updatedKollel;

            const response = await fetch(`${API_BASE_URL}/kollels/${updatedKollel.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataForBackend),
            });
            if (!response.ok) throw new Error('Failed to update kollel');

            const responseData = await response.json();
            console.log('✅ Update response:', responseData);

            // Transform response data _id to id
            const transformedResponse = {
                ...responseData,
                id: responseData._id,
                _id: undefined
            };

            console.log('🔄 Transformed update response:', transformedResponse);
            return transformedResponse;
        } catch (error) {
            console.error('Failed to update kollel on server:', error);
            throw error;
        }
    }
};

/**
 * Deletes a kollel.
 */
export const deleteKollel = async (kollelId: string): Promise<void> => {
    if (isStudioEnv()) {
        console.log('API: Using localStorage for deleteKollel');
        const kollels = await getKollels();
        const updatedKollels = kollels.filter(k => k.id !== kollelId);
        saveAllKollels_LS(updatedKollels);
    } else {
        // SERVER-SIDE IMPLEMENTATION
        console.log(`API: Deleting kollel ${kollelId} on server...`);
        try {
            const response = await fetch(`${API_BASE_URL}/kollels/${kollelId}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete kollel');
        } catch (error) {
            console.error('Failed to delete kollel on server:', error);
            throw error;
        }
    }
};


// --- Monthly Data Management API ---

/**
 * Fetches saved monthly reports for a specific kollel.
 */
export const getSavedData = async (kollelId: string): Promise<MonthlyData[]> => {
    console.log(`🔍 getSavedData called for kollel: ${kollelId}`);

    if (isStudioEnv()) {
        console.log(`API: Using localStorage for getSavedData for kollel ${kollelId}`);
        try {
            const data = localStorage.getItem(`savedData_${kollelId}`);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Failed to load or parse saved data", e);
            return [];
        }
    } else {
        // SERVER-SIDE IMPLEMENTATION
        console.log(`API: Fetching saved data for kollel ${kollelId} from server...`);
        try {
            const url = `${API_BASE_URL}/kollels/${kollelId}/data`;
            console.log(`🌐 Making request to: ${url}`);

            const response = await fetch(url);
            console.log(`📡 Response status: ${response.status} ${response.statusText}`);

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const data = await response.json();
            console.log(`✅ Received data:`, data);
            return data;
        } catch (error) {
            console.error('❌ Failed to fetch saved data from server:', error);
            throw error;
        }
    }
};

/**
 * Saves a new monthly report for a kollel.
 */
export const saveMonthlyData = async (kollelId: string, newData: MonthlyData): Promise<void> => {
    if (isStudioEnv()) {
        console.log(`API: Using localStorage for saveMonthlyData for kollel ${kollelId}`);
        const allData = await getSavedData(kollelId);
        const filteredData = allData.filter(d => d.monthYear !== newData.monthYear);
        const updatedData = [...filteredData, newData].sort((a, b) => b.monthYear.localeCompare(a.monthYear));
        saveAllData_LS(kollelId, updatedData);
    } else {
        // SERVER-SIDE IMPLEMENTATION
        console.log(`API: Saving monthly data for kollel ${kollelId} on server...`);
        try {
            const response = await fetch(`${API_BASE_URL}/kollels/${kollelId}/data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData),
            });
            if (!response.ok) throw new Error('Failed to save monthly data');
        } catch (error) {
            console.error('Failed to save monthly data on server:', error);
            throw error;
        }
    }
};

/**
 * Deletes a monthly report for a kollel.
 */
export const deleteMonthlyData = async (kollelId: string, monthYearToDelete: string): Promise<void> => {
    if (isStudioEnv()) {
        console.log(`API: Using localStorage for deleteMonthlyData for kollel ${kollelId}`);
        const allData = await getSavedData(kollelId);
        const updatedData = allData.filter(d => d.monthYear !== monthYearToDelete);
        saveAllData_LS(kollelId, updatedData);
    } else {
        // SERVER-SIDE IMPLEMENTATION
        console.log(`API: Deleting monthly data for kollel ${kollelId} on server...`);
        try {
            const monthYearParam = monthYearToDelete.replace('/', '-');
            const response = await fetch(`${API_BASE_URL}/kollels/${kollelId}/data/${monthYearParam}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete monthly data');
        } catch (error) {
            console.error('Failed to delete monthly data on server:', error);
            throw error;
        }
    }
};
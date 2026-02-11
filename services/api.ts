
import type { KollelDetails, MonthlyData, StipendSettings } from '../types';

/**
 * Gets the authentication token from localStorage
 */
const getAuthToken = (): string | null => {
    return localStorage.getItem('authToken');
};

/**
 * Creates headers with authentication if token is available
 */
const createAuthHeaders = (): HeadersInit => {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

/**
 * Checks if the app is running in an environment that should use localStorage.
 * This is a simple check for being inside an iframe, typical for platforms like AI Studio.
 * @returns {boolean} True if it's a frontend-only environment, false otherwise.
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
            const response = await fetch(`${API_BASE_URL}/kollels`, {
                headers: createAuthHeaders(),
            });
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
 * Get all kollels for super admin (includes owner information)
 */
export const getAllKollelsForAdmin = async (): Promise<KollelDetails[]> => {
    const studioEnv = isStudioEnv();
    console.log('🔍 getAllKollelsForAdmin Debug Info:', {
        isStudioEnv: studioEnv,
        apiBaseUrl: API_BASE_URL
    });

    if (studioEnv) {
        // In studio environment, return the same as regular kollels
        return getKollels();
    } else {
        // SERVER-SIDE IMPLEMENTATION
        console.log('API: Fetching all kollels for admin from server...');
        console.log('🌐 Making request to:', `${API_BASE_URL}/kollels/admin/all`);
        try {
            const response = await fetch(`${API_BASE_URL}/kollels/admin/all`, {
                headers: createAuthHeaders(),
            });
            console.log('📡 Admin response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Admin response error text:', errorText);
                throw new Error(`Failed to fetch all kollels: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('✅ All kollels fetched successfully for admin:', data);

            // Transform MongoDB _id to id for frontend compatibility
            const transformedData = data.map((kollel: any) => ({
                ...kollel,
                id: kollel._id,
                // Preserve userId information for super admin view
                userId: kollel.userId ? {
                    _id: kollel.userId._id,
                    name: kollel.userId.name,
                    email: kollel.userId.email
                } : undefined,
                // Remove _id to avoid confusion
                _id: undefined
            }));

            console.log('🔄 Admin transformed data with proper IDs:', transformedData);
            return transformedData;
        } catch (error) {
            console.error('❌ Error fetching all kollels for admin:', error);
            throw error;
        }
    }
};

/**
 * Adds a new kollel.
 */
export const addKollel = async (kollelData: { name: string; managerName?: string; phone?: string; address?: string; settings: StipendSettings; sharedWith?: string[] }): Promise<KollelDetails> => {
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
                headers: createAuthHeaders(),
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

            // Fix: Corrected variable from 'updatedKoll_id' to 'updatedKollel.id'.
            const response = await fetch(`${API_BASE_URL}/kollels/${updatedKollel.id}`, {
                method: 'PUT',
                headers: createAuthHeaders(),
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
                headers: createAuthHeaders(),
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

            const response = await fetch(url, { headers: createAuthHeaders() });
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
                headers: createAuthHeaders(),
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
            const monthYearParam = monthYearToDelete.replace(/\//g, '-');
            const response = await fetch(`${API_BASE_URL}/kollels/${kollelId}/data/${monthYearParam}`, {
                method: 'DELETE',
                headers: createAuthHeaders(),
            });
            if (!response.ok) throw new Error('Failed to delete monthly data');
        } catch (error) {
            console.error('Failed to delete monthly data on server:', error);
            throw error;
        }
    }
};

/**
 * Exports all data for a specific kollel (Details + Monthly Data).
 */
export const exportFullKollel = async (kollelId: string): Promise<{ kollel: KollelDetails, data: MonthlyData[] }> => {
    try {
        const kollels = await getKollels();
        const kollel = kollels.find(k => k.id === kollelId);
        if (!kollel) throw new Error("Kollel not found");
        
        const data = await getSavedData(kollelId);
        
        // Remove DB specific IDs to ensure clean export
        const cleanKollel = { ...kollel };
        // @ts-ignore
        delete cleanKollel._id;
        
        return { kollel: cleanKollel, data };
    } catch (e) {
        console.error("Export failed", e);
        throw e;
    }
};

/**
 * Imports a full kollel backup.
 * Creates a NEW Kollel entry to avoid ID conflicts and associates the data with it.
 */
export const importFullKollel = async (backupData: { kollel: KollelDetails, data: MonthlyData[] }): Promise<void> => {
    try {
        // 1. Create new Kollel (this will generate a new ID in the backend)
        const newKollelPayload = {
            ...backupData.kollel,
            name: `${backupData.kollel.name} (Imported)`, // Distinct name
            id: undefined // Let backend generate ID
        };
        
        // Remove any old IDs from the payload
        // @ts-ignore
        delete newKollelPayload._id; 
        // @ts-ignore
        delete newKollelPayload.id;

        const newKollel = await addKollel(newKollelPayload as any);
        console.log("Import: Created new kollel", newKollel.id);

        // 2. Save all monthly reports to the new ID
        for (const monthData of backupData.data) {
            await saveMonthlyData(newKollel.id, monthData);
        }
        console.log("Import: Saved all monthly data");
    } catch (e) {
        console.error("Import failed", e);
        throw e;
    }
};

/**
 * Sends a natural language prompt to the backend to generate stipend settings using AI.
 * @param prompt The user's description of the stipend calculation.
 * @returns A promise that resolves to a StipendSettings object.
 */
export const generateStipendSettingsFromPrompt = async (prompt: string): Promise<StipendSettings> => {
    // In Studio/preview mode, this should return a dummy result for demonstration.
    if (isStudioEnv()) {
        console.log('API: Using dummy data for generateStipendSettingsFromPrompt in Studio Env');
        await new Promise(resolve => setTimeout(resolve, 1500));

        const baseStipendMatch = prompt.match(/(\d{4,})/);
        const deductionMatch = prompt.match(/(\d{1,3})\s*(שקלים|ש"ח)\s*לשעה/);
        const deductionRate = deductionMatch ? parseInt(deductionMatch[1], 10) : 27;

        const dummySettings: StipendSettings = {
            baseStipend: baseStipendMatch ? parseInt(baseStipendMatch[0], 10) : 2150,
            deductions: {
                highRate: deductionRate,
                lowRate: deductionRate * 0.8,
                attendanceThresholdPercent: 90,
            },
            sedarim: [
                {
                    id: 1,
                    name: "סדר א'",
                    startTime: '09:00',
                    endTime: '13:00',
                    punctualityBonusEnabled: false,
                    punctualityLateThresholdMinutes: 10,
                    punctualityBonusAmount: 0,
                    punctualityBonusCancellationThreshold: 4,
                    partialStipendPercentage: 55,
                    useCustomDeductions: false,
                    deductions: { highRate: 25, lowRate: 20, attendanceThresholdPercent: 90 },
                },
                {
                    id: 2,
                    name: "סדר ב'",
                    startTime: '16:00',
                    endTime: '19:00',
                    punctualityBonusEnabled: false,
                    punctualityLateThresholdMinutes: 10,
                    punctualityBonusAmount: 0,
                    punctualityBonusCancellationThreshold: 4,
                    partialStipendPercentage: 45,
                    useCustomDeductions: false,
                    deductions: { highRate: 25, lowRate: 20, attendanceThresholdPercent: 90 },
                },
            ],
            generalBonuses: [],
            bonusAttendanceThresholdPercent: 80,
            rounding: 'none',
        };
        console.log('✅ Returning dummy AI-generated settings:', dummySettings);
        return Promise.resolve(dummySettings);
    }

    // This function will always target the server-side API for production/development,
    // as the AI logic cannot run in localStorage.
    console.log(`API: Sending prompt to AI for settings generation...`);
    try {
        const response = await fetch(`${API_BASE_URL}/kollels/generate-settings`, {
            method: 'POST',
            headers: createAuthHeaders(),
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Failed to generate settings from prompt' }));
            console.error('Error from server:', errorData);
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const settings = await response.json();
        console.log('✅ Received AI-generated settings:', settings);
        return settings;
    } catch (error) {
        console.error('Failed to generate stipend settings from prompt:', error);
        throw error;
    }
};

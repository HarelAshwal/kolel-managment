import type { KollelDetails, MonthlyData, StipendSettings } from '../types';

/**
 * Checks if the app is running in an environment that should use localStorage.
 * This is a simple check for being inside an iframe, typical for platforms like AI Studio.
 * @returns {boolean} True if it's likely an iframe environment, false otherwise.
 */
const isStudioEnv = (): boolean => {
  try {
    // If inside an iframe, window.top will be different or inaccessible.
    return window.self !== window.top;
  } catch (e) {
    // Accessing window.top can throw a cross-origin error, which means it's in an iframe.
    return true;
  }
};

const API_BASE_URL = '/api'; // Placeholder for the actual server API base URL

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
  if (isStudioEnv()) {
    console.log('API: Using localStorage for getKollels');
    try {
      const savedKollels = localStorage.getItem('kollelsList');
      return savedKollels ? JSON.parse(savedKollels) : [];
    } catch (error) {
      console.error("Failed to parse kollels list from localStorage", error);
      return [];
    }
  } else {
    // SERVER-SIDE PLACEHOLDER
    console.log('API: Fetching kollels from server...');
    // Example:
    // const response = await fetch(`${API_BASE_URL}/kollels`);
    // if (!response.ok) throw new Error('Failed to fetch kollels');
    // return response.json();
    console.warn('Server integration for getKollels is a placeholder. Using localStorage as fallback.');
    try {
      const savedKollels = localStorage.getItem('kollelsList');
      return savedKollels ? JSON.parse(savedKollels) : [];
    } catch (error) { return []; }
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
        // SERVER-SIDE PLACEHOLDER
        console.log('API: Adding kollel on server...');
        // Example:
        // const response = await fetch(`${API_BASE_URL}/kollels`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(kollelData),
        // });
        // if (!response.ok) throw new Error('Failed to add kollel');
        // return response.json(); // The server would return the created object with an ID
        console.warn('Server integration for addKollel is a placeholder. Using localStorage as fallback.');
        const kollels = await getKollels();
        const updatedKollels = [...kollels, newKollel];
        saveAllKollels_LS(updatedKollels);
        return newKollel; // Optimistically return the new object
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
        // SERVER-SIDE PLACEHOLDER
        console.log(`API: Updating kollel ${updatedKollel.id} on server...`);
        // Example:
        // const response = await fetch(`${API_BASE_URL}/kollels/${updatedKollel.id}`, {
        //     method: 'PUT',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(updatedKollel),
        // });
        // if (!response.ok) throw new Error('Failed to update kollel');
        // return response.json();
        console.warn('Server integration for updateKollel is a placeholder. Using localStorage as fallback.');
        const kollels = await getKollels();
        const updatedKollels = kollels.map(k => k.id === updatedKollel.id ? updatedKollel : k);
        saveAllKollels_LS(updatedKollels);
        return updatedKollel; // Optimistically return the updated object
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
        // SERVER-SIDE PLACEHOLDER
        console.log(`API: Deleting kollel ${kollelId} on server...`);
        // Example:
        // const response = await fetch(`${API_BASE_URL}/kollels/${kollelId}`, {
        //     method: 'DELETE',
        // });
        // if (!response.ok) throw new Error('Failed to delete kollel');
        console.warn('Server integration for deleteKollel is a placeholder. Using localStorage as fallback.');
        const kollels = await getKollels();
        const updatedKollels = kollels.filter(k => k.id !== kollelId);
        saveAllKollels_LS(updatedKollels);
    }
};


// --- Monthly Data Management API ---

/**
 * Fetches saved monthly reports for a specific kollel.
 */
export const getSavedData = async (kollelId: string): Promise<MonthlyData[]> => {
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
        // SERVER-SIDE PLACEHOLDER
        console.log(`API: Fetching saved data for kollel ${kollelId} from server...`);
        // Example:
        // const response = await fetch(`${API_BASE_URL}/kollels/${kollelId}/data`);
        // if (!response.ok) throw new Error('Failed to fetch saved data');
        // return response.json();
        console.warn('Server integration for getSavedData is a placeholder. Using localStorage as fallback.');
         try {
            const data = localStorage.getItem(`savedData_${kollelId}`);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
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
        const updatedData = [...filteredData, newData].sort((a,b) => b.monthYear.localeCompare(a.monthYear));
        saveAllData_LS(kollelId, updatedData);
    } else {
        // SERVER-SIDE PLACEHOLDER
        console.log(`API: Saving monthly data for kollel ${kollelId} on server...`);
        // Example:
        // const response = await fetch(`${API_BASE_URL}/kollels/${kollelId}/data`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(newData),
        // });
        // if (!response.ok) throw new Error('Failed to save monthly data');
        console.warn('Server integration for saveMonthlyData is a placeholder. Using localStorage as fallback.');
        const allData = await getSavedData(kollelId);
        const filteredData = allData.filter(d => d.monthYear !== newData.monthYear);
        const updatedData = [...filteredData, newData].sort((a,b) => b.monthYear.localeCompare(a.monthYear));
        saveAllData_LS(kollelId, updatedData);
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
        // SERVER-SIDE PLACEHOLDER
        console.log(`API: Deleting monthly data for kollel ${kollelId} on server...`);
        // Example:
        // const monthYearParam = monthYearToDelete.replace('/', '-');
        // const response = await fetch(`${API_BASE_URL}/kollels/${kollelId}/data/${monthYearParam}`, {
        //     method: 'DELETE',
        // });
        // if (!response.ok) throw new Error('Failed to delete monthly data');
        console.warn('Server integration for deleteMonthlyData is a placeholder. Using localStorage as fallback.');
        const allData = await getSavedData(kollelId);
        const updatedData = allData.filter(d => d.monthYear !== monthYearToDelete);
        saveAllData_LS(kollelId, updatedData);
    }
};

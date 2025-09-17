import React, { useState, useEffect } from 'react';

interface VersionInfo {
    version: string;
    buildDate: string;
    gitCommit: string;
    buildNumber: string;
}

interface VersionDisplayProps {
    className?: string;
}

const VersionDisplay: React.FC<VersionDisplayProps> = ({ className = '' }) => {
    const [showDetails, setShowDetails] = useState(false);
    const [versionInfo, setVersionInfo] = useState<VersionInfo>({
        version: 'loading...',
        buildDate: new Date().toISOString(),
        gitCommit: 'unknown',
        buildNumber: 'loading'
    });

    // Load version info on component mount
    useEffect(() => {
        const loadVersionInfo = async () => {
            try {
                const versionModule = await import('../version');
                setVersionInfo(versionModule.VERSION_INFO);
                console.log('Version info loaded successfully:', versionModule.VERSION_INFO);       
            } catch (error) {
                console.warn('Could not load version info, using fallback:', error);
                setVersionInfo({
                    version: 'dev',
                    buildDate: new Date().toISOString(),
                    gitCommit: 'unknown',
                    buildNumber: 'dev-build'
                });
            }
        };
        loadVersionInfo();
    }, []);

    const baseStyles: React.CSSProperties = {
        position: 'fixed',
        bottom: '8px',
        right: '8px',
        fontSize: '12px',
        color: '#6b7280',
        fontFamily: 'monospace',
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '4px 8px',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
        userSelect: 'none'
    };

    const detailsStyles: React.CSSProperties = {
        position: 'absolute',
        bottom: '100%',
        right: '0',
        marginBottom: '4px',
        backgroundColor: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        minWidth: '200px',
        fontSize: '11px',
        color: '#374151'
    };

    return (
        <div style={baseStyles} className={className}>
            <div onClick={() => setShowDetails(!showDetails)}>
                v{versionInfo.version}
            </div>

            {showDetails && (
                <div style={detailsStyles}>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Version Details</div>  
                    <div style={{ marginBottom: '4px' }}>
                        <strong>Version:</strong> {versionInfo.version}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                        <strong>Build:</strong> {versionInfo.buildNumber}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                        <strong>Commit:</strong> {versionInfo.gitCommit.substring(0, 8)}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                        <strong>Built:</strong> {new Date(versionInfo.buildDate).toLocaleString()}  
                    </div>
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', color: '#6b7280' }}>
                        Click to close
                    </div>
                </div>
            )}
        </div>
    );
};

export default VersionDisplay;

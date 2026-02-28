import React, { useState } from 'react';


const SolitaireSetup: React.FC = () => {
  const [boardType, setBoardType] = useState('English');
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '400px', border: '1px solid #ccc' }}>
      <h2 style={{ marginBottom: '5px' }}>CS 449: Solitaire Project</h2>
      <p style={{ color: '#666' }}>Sprint 0 GUI Demonstration</p>

      <hr style={{ border: '0', height: '2px', background: '#333', margin: '20px 0' }} />

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Select Board Type:</strong></p>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <input 
            type="radio" 
            value="English" 
            checked={boardType === 'English'} 
            onChange={(e) => setBoardType(e.target.value)} 
          /> English
        </label>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <input 
            type="radio" 
            value="Hexagon" 
            checked={boardType === 'Hexagon'} 
            onChange={(e) => setBoardType(e.target.value)} 
          /> Hexagon
        </label>
        <label style={{ display: 'block' }}>
          <input 
            type="radio" 
            value="Diamond" 
            checked={boardType === 'Diamond'} 
            onChange={(e) => setBoardType(e.target.value)} 
          /> Diamond
        </label>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={isRecording} 
            onChange={() => setIsRecording(!isRecording)} 
            style={{ marginRight: '10px' }}
          />
          Record this game session
        </label>
      </div>

   
     
    </div>
  );
};

export default SolitaireSetup;
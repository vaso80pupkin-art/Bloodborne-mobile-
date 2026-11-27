import React from 'react'

const barStyle = (fillColor, value) => ({
  width: `${value}%`,
  height: '100%',
  background: `linear-gradient(180deg, ${fillColor}, #1a0505)`,
  boxShadow: '0 0 8px rgba(120, 20, 20, 0.6)',
  transition: 'width 0.25s ease-out'
})

const frameStyle = {
  border: '1px solid #3a2a18',
  background: 'rgba(5, 3, 3, 0.75)',
  padding: '2px',
  boxSizing: 'border-box'
}

const labelStyle = {
  fontSize: '10px',
  letterSpacing: '3px',
  textTransform: 'uppercase',
  color: '#8a7038',
  marginBottom: '3px',
  textShadow: '0 1px 3px #000'
}

export function Hud() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        padding: '18px',
        boxSizing: 'border-box'
      }}
    >
      <div style={{ position: 'absolute', top: 18, left: 18 }}>
        <div style={labelStyle}>Здоровье</div>
        <div style={{ ...frameStyle, width: 260, height: 14 }}>
          <div style={barStyle('#7a1010', 84)} />
        </div>
        <div style={{ ...labelStyle, marginTop: 8 }}>Выносливость</div>
        <div style={{ ...frameStyle, width: 200, height: 10 }}>
          <div style={{ ...barStyle('#4a4a3a', 65), boxShadow: '0 0 6px rgba(90, 90, 60, 0.5)' }} />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#5a4a30',
          fontSize: 11,
          letterSpacing: 4,
          textTransform: 'uppercase',
          textShadow: '0 1px 4px #000'
        }}
      >
        Yharnam · Ночной кошмар охотника
      </div>
    </div>
  )
}

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wallet } from 'lucide-react';
import { CATEGORIES, COLORS, getCategoryName } from '../data/constants';

interface StatsViewProps {
  data: { name: string; value: number }[];
  total: number;
}

export const StatsView: React.FC<StatsViewProps> = ({ data, total }) => {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {data.length > 0 ? (
        <>
          {/* График */}
          <div style={{ width: '100%', height: '220px', flexShrink: 0, position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => {
                    const cat = CATEGORIES.find(c => c.id === entry.name);
                    return <Cell key={`cell-${index}`} fill={cat ? cat.color : COLORS[index % COLORS.length]} />;
                  })}
                </Pie>
                <Tooltip formatter={(value: number) => `${value} ₽`} />
              </PieChart>
            </ResponsiveContainer>
            
            <div style={{ 
                  position: 'absolute', top: '90px', left: '0', right: '0', 
                  textAlign: 'center', pointerEvents: 'none', color: '#6B4C75', fontWeight: 'bold' 
            }}>
              Всего:<br/>{total} ₽
            </div>
          </div>

          {/* Список */}
          <div style={{width: '100%', marginTop: 20}}>
            {data.map((entry, index) => {
              const cat = CATEGORIES.find(c => c.id === entry.name);
              const color = cat ? cat.color : COLORS[index % COLORS.length];
              return (
                <div key={index} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                  borderBottom: '1px solid #F0F0F0'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                    <div style={{width: 12, height: 12, borderRadius: '50%', background: color}} />
                    <span style={{fontWeight: 600, color: '#2D3436'}}>{getCategoryName(entry.name)}</span>
                  </div>
                  <span style={{fontWeight: 700, color: '#6B4C75'}}>{entry.value} ₽</span>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div style={{textAlign: 'center', marginTop: 50, color: '#9E9E9E'}}>
          <Wallet size={48} style={{opacity: 0.3, marginBottom: 10}} />
          <p>Трат пока нет. <br/>Добавьте первый расход!</p>
        </div>
      )}
    </div>
  );
};
/**
 * Service to fetch real-time data for Lake Lanier from USGS.
 */

export interface LakeData {
  waterLevel: number;
  airTemp: number | null;
  waterTemp: number | null;
  dateTime: string;
}

const SITE_IDS = ['02334430', '02334400']; // Lake Sidney Lanier stations (Lake first, then River)
const PRIMARY_SITE_ID = '02334430'; // Lake Sidney Lanier near Buford, GA

export async function fetchLakeData(): Promise<LakeData> {
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${SITE_IDS.join(',')}&parameterCd=00062,00010,00020&siteStatus=all`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`USGS API error: ${response.statusText}`);
    }
    
    const json = await response.json();
    const timeSeries = json.value.timeSeries;
    
    let waterLevel = 0;
    let airTemp: number | null = null;
    let waterTemp: number | null = null;
    let dateTime = '';

    // Sort timeSeries so we prefer certain sites if data is duplicated
    // But here we just want to fill in the blanks
    timeSeries.forEach((ts: any) => {
      const paramCode = ts.variable.variableCode[0].value;
      if (!ts.values[0] || !ts.values[0].value || ts.values[0].value.length === 0) return;
      
      // Get the most recent value (last in the array)
      const latestReading = ts.values[0].value[ts.values[0].value.length - 1];
      const value = parseFloat(latestReading.value);
      const dt = latestReading.dateTime;
      
      if (paramCode === '00062' && waterLevel === 0) {
        waterLevel = value;
        dateTime = dt;
      } else if (paramCode === '00020' && airTemp === null) {
        // Convert Celsius to Fahrenheit
        airTemp = (value * 9/5) + 32;
      } else if (paramCode === '00010' && waterTemp === null) {
        waterTemp = (value * 9/5) + 32;
      }
    });

    return {
      waterLevel,
      airTemp,
      waterTemp,
      dateTime: dateTime || new Date().toISOString()
    };
  } catch (error) {
    console.error('Failed to fetch lake data:', error);
    throw error;
  }
}

export interface RecentReading {
  date: string;
  high: number;
  low: number;
  rain: number;
  lastLevel: number;
}

export async function fetchRecentReadings(days: number = 7): Promise<RecentReading[]> {
  // Use 'iv' (instantaneous) instead of 'dv' (daily) because it's more up-to-date
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${SITE_IDS.join(',')}&startDT=${startDate}&endDT=${endDate}&parameterCd=00062,00045,00065&siteStatus=all`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch recent readings');
    
    const json = await response.json();
    const timeSeries = json.value.timeSeries;
    
    if (!timeSeries || timeSeries.length === 0) return [];

    const readingsMap: { [key: string]: { levels: number[], rain: number, lastLevel: number } } = {};
    
    timeSeries.forEach((ts: any) => {
      const paramCode = ts.variable.variableCode[0].value;
      const values = ts.values[0].value;
      if (!values || values.length === 0) return;

      values.forEach((v: any) => {
        const dateObj = new Date(v.dateTime);
        const dateKey = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        
        if (!readingsMap[dateKey]) {
          readingsMap[dateKey] = { levels: [], rain: 0, lastLevel: 0 };
        }
        
        const val = parseFloat(v.value);
        if (isNaN(val) || val === -999999) return;

        if (paramCode === '00062' || paramCode === '00065') {
          readingsMap[dateKey].levels.push(val);
          // Keep track of the last level reading of the day
          readingsMap[dateKey].lastLevel = val;
        } else if (paramCode === '00045') {
          // For IV, precipitation is often cumulative or 15-min increments
          // We'll take the max for the day as a rough estimate of daily total if it's cumulative
          if (val > readingsMap[dateKey].rain) {
            readingsMap[dateKey].rain = val;
          }
        }
      });
    });
    
    return Object.entries(readingsMap)
      .map(([date, data]) => ({
        date,
        high: data.levels.length > 0 ? Math.max(...data.levels) : 0,
        low: data.levels.length > 0 ? Math.min(...data.levels) : 0,
        rain: data.rain,
        lastLevel: data.lastLevel
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(r => r.high > 0)
      .slice(0, days);
    
  } catch (error) {
    console.error('Failed to fetch recent readings:', error);
    return [];
  }
}

export async function fetchHistoricalData(days: number = 7): Promise<any[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // USGS 'iv' (instantaneous) is limited to ~120 days. Use 'dv' (daily) for longer periods.
  const service = days <= 90 ? 'iv' : 'dv';
  
  // Query both sites to ensure we get data
  const url = `https://waterservices.usgs.gov/nwis/${service}/?format=json&sites=${SITE_IDS.join(',')}&startDT=${startDate}&endDT=${endDate}&parameterCd=00062,00065&siteStatus=all`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch historical data');
    
    const json = await response.json();
    const timeSeries = json.value.timeSeries;
    
    if (!timeSeries || timeSeries.length === 0) return [];

    // Strategy: 
    // 1. Look for 00062 (Lake Level) at site 02334400 (Primary Lake)
    // 2. Look for 00062 at any site
    // 3. Look for 00065 (Gage Height) at any site
    let levelSeries = timeSeries.find((ts: any) => 
      ts.sourceInfo.siteCode[0].value === '02334400' && 
      ts.variable.variableCode[0].value === '00062'
    );

    if (!levelSeries) {
      levelSeries = timeSeries.find((ts: any) => ts.variable.variableCode[0].value === '00062');
    }

    if (!levelSeries) {
      levelSeries = timeSeries.find((ts: any) => ts.variable.variableCode[0].value === '00065');
    }

    if (!levelSeries || !levelSeries.values[0] || !levelSeries.values[0].value || levelSeries.values[0].value.length === 0) {
      return [];
    }
    
    const values = levelSeries.values[0].value;
    
    // Sampling logic to keep chart performant
    let sampled;
    if (service === 'iv') {
      // Instantaneous values are every 15 mins
      // 1 day: every hour (step 4)
      // 7 days: every 4 hours (step 16)
      // 30-90 days: every 12 hours (step 48)
      const step = days <= 1 ? 4 : days <= 7 ? 16 : 48;
      sampled = values.filter((_: any, i: number) => i % step === 0);
    } else {
      // Daily values (dv)
      // 6 months: every 2 days (step 2)
      // 1 year: every 5 days (step 5)
      const step = days <= 180 ? 2 : 5;
      sampled = values.filter((_: any, i: number) => i % step === 0);
    }

    return sampled.map((v: any) => {
      const date = new Date(v.dateTime);
      return {
        name: days <= 1 
          ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
          : date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: days > 60 ? undefined : 'numeric',
              year: days > 365 ? '2-digit' : undefined
            }),
        level: parseFloat(v.value),
        fullDate: date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric',
          hour: days <= 7 ? 'numeric' : undefined,
          minute: days <= 7 ? '2-digit' : undefined
        })
      };
    });
    
  } catch (error) {
    console.error('Failed to fetch historical data:', error);
    return [];
  }
}

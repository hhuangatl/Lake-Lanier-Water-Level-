/**
 * Service to fetch real-time data for Lake Lanier from USGS.
 */

export interface LakeData {
  waterLevel: number;
  airTemp: number | null;
  waterTemp: number | null;
  dateTime: string;
}

const SITE_ID = '02334400'; // Lake Sidney Lanier near Buford, GA

export async function fetchLakeData(): Promise<LakeData> {
  const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${SITE_ID}&parameterCd=00062,00010,00020&siteStatus=all`;
  
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

    timeSeries.forEach((ts: any) => {
      const paramCode = ts.variable.variableCode[0].value;
      const value = parseFloat(ts.values[0].value[0].value);
      const dt = ts.values[0].value[0].dateTime;
      
      if (paramCode === '00062') {
        waterLevel = value;
        dateTime = dt;
      } else if (paramCode === '00020') {
        // Convert Celsius to Fahrenheit
        airTemp = (value * 9/5) + 32;
      } else if (paramCode === '00010') {
        waterTemp = (value * 9/5) + 32;
      }
    });

    return {
      waterLevel,
      airTemp,
      waterTemp,
      dateTime
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
}

export async function fetchRecentReadings(days: number = 7): Promise<RecentReading[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - (days + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Fetch daily values (dv) for water level (00062) and precipitation (00045)
  // We fetch multiple statistics to be safe: 00001 (Max), 00002 (Min), 00003 (Mean), 00006 (Sum for rain)
  const url = `https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${SITE_ID}&startDT=${startDate}&endDT=${endDate}&parameterCd=00062,00045&siteStatus=all`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch recent readings');
    
    const json = await response.json();
    const timeSeries = json.value.timeSeries;
    
    const readingsMap: { [key: string]: RecentReading } = {};
    
    timeSeries.forEach((ts: any) => {
      const paramCode = ts.variable.variableCode[0].value;
      // Extract statistic code from the variable options or name
      const statCode = ts.variable.options.option.find((opt: any) => opt.name === 'Statistic')?.value || 
                       ts.variable.variableName.toLowerCase().includes('maximum') ? '00001' :
                       ts.variable.variableName.toLowerCase().includes('minimum') ? '00002' :
                       ts.variable.variableName.toLowerCase().includes('mean') ? '00003' : '';
      
      const values = ts.values[0].value;
      
      values.forEach((v: any) => {
        const date = new Date(v.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (!readingsMap[date]) {
          readingsMap[date] = { date, high: 0, low: 0, rain: 0 };
        }
        
        const val = parseFloat(v.value);
        if (isNaN(val)) return;

        if (paramCode === '00062') {
          if (statCode === '00001') {
            readingsMap[date].high = val;
          } else if (statCode === '00002') {
            readingsMap[date].low = val;
          } else if (statCode === '00003' || statCode === '') {
            // If we only have mean or a generic value, use it for both if they are still 0
            if (readingsMap[date].high === 0) readingsMap[date].high = val;
            if (readingsMap[date].low === 0) readingsMap[date].low = val;
          }
        } else if (paramCode === '00045') {
          readingsMap[date].rain = val;
        }
      });
    });
    
    // Convert map to sorted array (descending date)
    return Object.values(readingsMap)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, days);
    
  } catch (error) {
    console.error('Failed to fetch recent readings:', error);
    return [];
  }
}
export async function fetchHistoricalData(days: number = 7): Promise<any[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Use 'dv' (daily values) for longer periods to be more efficient
  // Use 'iv' (instantaneous values) for short periods (<= 30 days) for higher resolution
  const service = days <= 30 ? 'iv' : 'dv';
  const url = `https://waterservices.usgs.gov/nwis/${service}/?format=json&sites=${SITE_ID}&startDT=${startDate}&endDT=${endDate}&parameterCd=00062&siteStatus=all`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch historical data');
    
    const json = await response.json();
    if (!json.value.timeSeries[0]) return [];
    
    const values = json.value.timeSeries[0].values[0].value;
    
    // Sampling logic
    let sampled;
    if (days <= 7) {
      // For 7 days, show 4-hour intervals if using 'iv'
      sampled = values.filter((_: any, i: number) => i % 4 === 0);
    } else if (days <= 31) {
      // For 1 month, show daily if using 'iv'
      sampled = values.filter((_: any, i: number) => i % 24 === 0);
    } else {
      // For 6M or 1Y, we are using 'dv' which is already daily
      // If 1Y, maybe sample every 3 days to keep chart clean
      const step = days > 200 ? 5 : 1;
      sampled = values.filter((_: any, i: number) => i % step === 0);
    }

    return sampled.map((v: any) => ({
      name: new Date(v.dateTime).toLocaleDateString('en-US', { 
        month: 'short', 
        day: days > 31 ? undefined : 'numeric',
        year: days > 365 ? '2-digit' : undefined
      }),
      level: parseFloat(v.value),
      fullDate: new Date(v.dateTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }));
    
  } catch (error) {
    console.error('Failed to fetch historical data:', error);
    return [];
  }
}

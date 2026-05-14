import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';

import { HttpClient, HttpParams } from '@angular/common/http';
import { ChangeDetectorRef, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ChartModule,
    CardModule,
    ButtonModule,
    DatePickerModule,
    TableModule
  ],
  templateUrl: './reports.html',
  styleUrls: ['./reports.css']
})
export class Reports implements OnInit {
  private http = inject(HttpClient);
  private cd = inject(ChangeDetectorRef);


  // KPI Data
  // KPI Data
  totalSpend = 0;
  monthlyAverage = 0;
  topCategory = '-';
  savings = 0; // נשאיר כרגע סטטי או נחשב אם יש נתוני תקציב
  
  hasData = false; // Add flag to track if user has any invoices

  // Chart Data
  monthlyTrendData: any;
  monthlyTrendOptions: any;

  categoryData: any;
  categoryOptions: any;

  topVendorsData: any;
  topVendorsOptions: any;

  // Filters
  dateRange: Date[] | undefined;
  
  ngOnInit() {
    this.initCharts();
    this.fetchData();
  }

  onDateChange() {
    if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
        this.fetchData();
    } else if (!this.dateRange || this.dateRange.length === 0 || !this.dateRange[0]) {
        this.fetchData();
    }
  }

  fetchData() {
    let paramsInvoices = new HttpParams();
    let paramsCategory = new HttpParams();

    if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
        const start = this.dateRange[0];
        const end = this.dateRange[1];
        
        // Fix timezone offset issue before formatting
        const localStart = new Date(start.getTime() - (start.getTimezoneOffset() * 60000));
        const localEnd = new Date(end.getTime() - (end.getTimezoneOffset() * 60000));
        
        const fromStr = localStart.toISOString().split('T')[0];
        const toStr = localEnd.toISOString().split('T')[0];

        paramsInvoices = paramsInvoices.set('fromDate', fromStr).set('toDate', toStr);
        paramsCategory = paramsCategory.set('from', fromStr).set('to', toStr);
    }

    // Rely on interceptor for Authorization headers
    forkJoin({
        invoices: this.http.get<any[]>("http://localhost:5042/api/Invoices", { params: paramsInvoices }),
        categorySummary: this.http.get<any[]>("http://localhost:5042/api/Invoices/summary/by-category", { params: paramsCategory }),
        profile: this.http.get<any>("http://localhost:5042/api/account/profile")
    }).subscribe({
        next: (response) => {
            console.log('Reports Data:', response);
            
            if (response.invoices && response.invoices.length > 0) {
                this.hasData = true;
                const budget = response.profile?.budget || 0;
                this.processKPIs(response.invoices, response.categorySummary, budget);
                this.updateMonthlyTrendChart(response.invoices);
                this.updateCategoryChart(response.categorySummary);
                this.updateTopVendorsChart(response.invoices);
            } else {
                this.hasData = false;
            }
            
            this.cd.detectChanges();
        },
        error: (err) => console.error("Error loading report data", err)
    });
  }

  processKPIs(invoices: any[], categories: any[], budget: number = 0) {
      // 1. Total Spend
      this.totalSpend = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

      // 2. Monthly Average & Savings Timeframe
      // נחשב את מספר החודשים לפי טווח התאריכים שנבחר. אם לא נבחר טווח - נניח ברירת מחדל של שנה (12 חודשים)
      let monthsCount = 12; 
      if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
          const start = this.dateRange[0];
          const end = this.dateRange[1];
          monthsCount = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
      }
      
      this.monthlyAverage = monthsCount > 0 ? Math.round(this.totalSpend / monthsCount) : 0;

      // 3. Top Category
      if (categories && categories.length > 0) {
          const top = categories.reduce((prev, current) => (prev.total > current.total) ? prev : current);
          this.topCategory = top.categoryName || 'Unknown';
      }
      
      // 4. Savings
      // Calculate savings based on budget minus actual spend
      const totalBudgetForPeriod = budget * (monthsCount > 0 ? monthsCount : 1);
      this.savings = Math.round(totalBudgetForPeriod - this.totalSpend); 
  }

  updateMonthlyTrendChart(invoices: any[]) {
      const labels: string[] = [];
      const data: number[] = [];
      const today = new Date(); // תאריך נוכחי
  
      let monthsCount = 12;
      let startYear = today.getFullYear();
      let startMonth = today.getMonth();

      // אם נבחר טווח תאריכים, נחשב את מספר החודשים ונקודת ההתחלה
      if (this.dateRange && this.dateRange[0] && this.dateRange[1]) {
          const start = this.dateRange[0];
          const end = this.dateRange[1];
          monthsCount = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
          
          // מתחילים מהתאריך המאוחר ביותר (end) והולכים אחורה monthsCount פעמים
          startYear = end.getFullYear();
          startMonth = end.getMonth();
      }

      // יצירת תוויות ונתונים לחודשים (החל מהחדש ביותר והולכים אחורה, אז נהפוך בסוף כדי להציג כרונולוגית)
      // כדי להציג כרונולוגית מימין לשמאל (או משמאל לימין) נרוץ מהישן לחדש:
      for (let i = monthsCount - 1; i >= 0; i--) {
          const d = new Date(startYear, startMonth - i, 1);
          // שמות חודשים בעברית
          const monthName = d.toLocaleString('he-IL', { month: 'long' });
          labels.push(monthName);
  
          // סיכום חשבוניות לחודש זה
          const monthlyTotal = invoices.reduce((sum, inv) => {
              const invDate = new Date(inv.invoiceDate);
              if (invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear()) {
                  return sum + (inv.total || 0);
              }
              return sum;
          }, 0);
  
          data.push(monthlyTotal);
      }

      this.monthlyTrendData = {
          ...this.monthlyTrendData,
          labels: labels,
          datasets: [{
              ...this.monthlyTrendData.datasets[0],
              data: data
          }]
      };
  }

  updateCategoryChart(categories: any[]) {
      let labels = [];
      let data = [];
      let bgColors: string[] = [];

      if (!categories || categories.length === 0) {
          labels = ['אין הוצאות מקוטלגות'];
          data = [1];
          bgColors = ['#e2e8f0']; // Grey color for empty state
      } else {
          const sortedData = [...categories].sort((a, b) => b.total - a.total);
          
          const baseColors = [
              '#3b82f6', '#a855f7', '#ec4899', '#22c55e', 
              '#f59e0b', '#6366f1', '#f43f5e', '#14b8a6', 
              '#f97316', '#8b5cf6', '#06b6d4', '#84cc16'
          ];
          
          if (sortedData.length > baseColors.length) {
              const maxCategories = baseColors.length - 1;
              const topCategories = sortedData.slice(0, maxCategories);
              const otherCategories = sortedData.slice(maxCategories);
              const othersTotal = otherCategories.reduce((sum, item) => sum + item.total, 0);
              
              labels = topCategories.map(x => x.categoryName || 'אחר');
              labels.push('אחרים');
              
              data = topCategories.map(x => x.total);
              data.push(othersTotal);
              
              bgColors = topCategories.map((_, i) => baseColors[i]);
              bgColors.push(baseColors[baseColors.length - 1]);
          } else {
              labels = sortedData.map(x => x.categoryName || 'אחר');
              data = sortedData.map(x => x.total);
              bgColors = sortedData.map((_, i) => baseColors[i]);
          }
      }

      this.categoryData = {
          labels: labels,
          datasets: [{
              data: data,
              backgroundColor: bgColors,
              hoverOffset: 15,
              borderWidth: 0
          }]
      };
  }

  updateTopVendorsChart(invoices: any[]) {
      // קיבוץ לפי ספק
      const vendorMap = new Map<string, number>();
      
      invoices.forEach(inv => {
          const vendorName = inv.vendorName || inv.supplier?.name || 'Unknown';
          const current = vendorMap.get(vendorName) || 0;
          vendorMap.set(vendorName, current + (inv.total || 0));
      });

      // המרה למערך ומיון
      const sortedVendors = Array.from(vendorMap.entries())
          .sort((a, b) => b[1] - a[1]) // יורד
          .slice(0, 5); // רק 5 הראשונים

      const labels = sortedVendors.map(v => v[0]);
      const data = sortedVendors.map(v => v[1]);

      this.topVendorsData = {
          ...this.topVendorsData,
          labels: labels,
          datasets: [{
              ...this.topVendorsData.datasets[0],
              data: data
          }]
      };
  }


  initCharts() {
    const documentStyle = getComputedStyle(document.documentElement);
    // Dark mode specific colors (changed to light mode for visibility)
    const textColor = '#1e293b'; // slate-800 for visibility on white background
    const textColorSecondary = '#64748b'; // slate-500
    const surfaceBorder = 'rgba(0, 0, 0, 0.1)';

    // 1. Monthly Trends (Line Chart)
    this.monthlyTrendData = {
      labels: ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר'],
      datasets: [
        {
          label: 'הוצאות',
          data: [2200, 3100, 2800, 4500, 2400, 3800, 4100, 3600, 4520],
          fill: true,
          borderColor: '#4ade80', // Green-400 (Vibrant Green)
          tension: 0.4,
          backgroundColor: (context: any) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(74, 222, 128, 0.5)'); // Green glow
            gradient.addColorStop(1, 'rgba(74, 222, 128, 0.0)');
            return gradient;
          },
          borderWidth: 3,
          pointBackgroundColor: '#22c55e', // Green-500
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 8
        }
      ]
    };

    this.monthlyTrendOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 10,
            displayColors: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            font: {
                family: 'Inter',
                size: 11
            }
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
            tickLength: 0
          }
        },
        y: {
          ticks: {
            color: textColorSecondary,
            callback: function(value: any) {
                return '₪' + value;
            },
            font: {
                family: 'Inter',
                size: 11
            }
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
            borderDash: [5, 5]
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };

    // 2. Category Distribution (Doughnut Chart)
    this.categoryData = {
      labels: ['מגורים', 'מזון', 'תחבורה', 'בילויים', 'שונות'],
      datasets: [
        {
          data: [1200, 800, 450, 300, 150],
          backgroundColor: [
            '#3b82f6', // Blue
            '#a855f7', // Purple
            '#ec4899', // Pink
            '#22c55e', // Green
            '#f59e0b'  // Orange
          ],
          hoverBackgroundColor: [
            '#60a5fa',
            '#c084fc',
            '#f472b6',
            '#4ade80',
            '#fbbf24'
          ],
          borderWidth: 0,
          hoverOffset: 15
        }
      ]
    };

    this.categoryOptions = {
      cutout: '65%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            pointStyle: 'circle',
            color: textColor,
            font: {
                family: 'Inter',
                size: 13
            },
            padding: 20
          }
        }
      }
    };

    // 3. Top Vendors (Horizontal Bar Chart)
    this.topVendorsData = {
      labels: ['רמי לוי', 'חשמל', 'סלקום', 'דלק', 'אמזון'],
      datasets: [
        {
          label: 'הוצאה חודשית',
          data: [2500, 1800, 1200, 900, 600],
          backgroundColor: '#06b6d4', // Cyan
          borderRadius: 8,
          barThickness: 20
        }
      ]
    };

    this.topVendorsOptions = {
        indexAxis: 'y',
        maintainAspectRatio: false,
        aspectRatio: 0.8,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleColor: '#f8fafc',
                bodyColor: '#e2e8f0',
                borderWidth: 0
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColorSecondary,
                    font: {
                        family: 'Inter',
                        size: 11
                    }
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textColor,
                    font: {
                        family: 'Inter',
                        weight: '500',
                        size: 12
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false
                }
            }
        }
    };
  }

  exportToExcel() {
      // נבדוק האם יש לנו נתונים
      // בדו"חות אין לנו array "expenses" נגיש באותה קלות, אלא אם נמפה מתוך categoryData, 
      // אבל אפשר להשתמש במיפוי קטגוריות כדו"ח בסיסי עבור מסך הדוחות.
      if (!this.categoryData || !this.categoryData.labels) {
          alert('אין נתונים לייצוא');
          return;
      }
  
      const workbook = new ExcelJS.Workbook();
      
      // 1. גיליון קטגוריות
      const worksheetCat = workbook.addWorksheet('סיכום קטגוריות');
      worksheetCat.addRow(['קטגוריה', 'סכום כולל']);
      worksheetCat.getRow(1).font = { bold: true };
      
      this.categoryData.labels.forEach((label: string, index: number) => {
          worksheetCat.addRow([label, this.categoryData.datasets[0].data[index]]);
      });
      worksheetCat.columns.forEach(column => column.width = 20);

      // 2. גיליון ספקים
      if (this.topVendorsData && this.topVendorsData.labels) {
          const worksheetVend = workbook.addWorksheet('הספקים המובילים');
          worksheetVend.addRow(['ספק', 'הוצאה כוללת']);
          worksheetVend.getRow(1).font = { bold: true };
          
          this.topVendorsData.labels.forEach((label: string, index: number) => {
              worksheetVend.addRow([label, this.topVendorsData.datasets[0].data[index]]);
          });
          worksheetVend.columns.forEach(column => column.width = 20);
      }
  
      workbook.xlsx.writeBuffer().then((data) => {
          const blob = new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          FileSaver.saveAs(blob, `Reports_Summary_${new Date().getTime()}.xlsx`);
      });
  }

  exportToPDF() {
    console.log('Exporting to PDF...');
    // Implementation would use jspdf here
  }
}

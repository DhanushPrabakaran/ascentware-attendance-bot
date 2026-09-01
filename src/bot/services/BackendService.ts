import axios from 'axios';

const API_URL = 'http://localhost:' + (process.env.PORT || 3000) + '/api/v1';

export class BackendService {
  static async getEmployeeByTeamsUserId(teamsUserId: string) {
    try {
      const res = await axios.get(
        API_URL + '/admin/employees/teams/' + teamsUserId,
      );
      return res.data;
    } catch (e) {
      return null;
    }
  }

  static async getManagers(teamsUserId: string) {
    try {
      const res = await axios.get(
        API_URL + '/admin/employees/teams/' + teamsUserId + '/managers',
      );
      return res.data;
    } catch (e) {
      return [];
    }
  }

  static async getSettings() {
    try {
      const res = await axios.get(API_URL + '/admin/settings');
      return res.data;
    } catch (e) {
      return null;
    }
  }

  static async linkTeamsUserId(email: string, teamsUserId: string) {
    const res = await axios.post(API_URL + '/admin/employees/link', {
      email,
      teamsUserId,
    });
    return res.data;
  }

  static async applyLeave(teamsUserId: string, reason: string) {
    const res = await axios.post(API_URL + '/admin/leaves', {
      teamsUserId,
      reason,
    });
    return res.data;
  }

  static async checkIn(teamsUserId: string) {
    const res = await axios.post(API_URL + '/attendance/check-in', {
      employeeId: teamsUserId,
    });
    return res.data;
  }

  static async saveWorkPlan(
    attendanceId: string,
    tasks: any[],
    permissionMinutes: number,
  ) {
    const res = await axios.post(API_URL + '/work-plan', {
      attendanceId,
      tasks,
      permissionMinutes,
    });
    return res.data;
  }

  static async startBreak(attendanceId: string) {
    const res = await axios.post(API_URL + '/attendance/break/start', {
      attendanceId,
    });
    return res.data;
  }

  static async endBreak(attendanceId: string) {
    const res = await axios.post(API_URL + '/attendance/break/end', {
      attendanceId,
    });
    return res.data;
  }

  static async getTasks(attendanceId: string) {
    const res = await axios.get(API_URL + '/work-plan/' + attendanceId);
    return res.data;
  }

  static async bulkUpdateTasks(tasks: any[]) {
    const res = await axios.put(API_URL + '/work-plan/bulk-progress', {
      tasks,
    });
    return res.data;
  }

  static async checkOut(attendanceId: string) {
    const res = await axios.post(API_URL + '/attendance/check-out', {
      attendanceId,
    });
    return res.data;
  }
}

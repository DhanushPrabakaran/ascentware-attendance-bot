import axios from 'axios';

const API_URL = `http://localhost:${process.env.PORT || 3000}/api/v1`;

export class BackendService {
    static async checkIn(teamsUserId: string) {
        const res = await axios.post(`${API_URL}/attendance/check-in`, { employeeId: teamsUserId });
        return res.data;
    }

    static async saveWorkPlan(attendanceId: string, tasks: any[], permissionMinutes: number) {
        const res = await axios.post(`${API_URL}/work-plan`, { attendanceId, tasks, permissionMinutes });
        return res.data;
    }

    static async startBreak(attendanceId: string) {
        const res = await axios.post(`${API_URL}/attendance/break/start`, { attendanceId });
        return res.data;
    }

    static async endBreak(attendanceId: string) {
        const res = await axios.post(`${API_URL}/attendance/break/end`, { attendanceId });
        return res.data;
    }

    static async getTasks(attendanceId: string) {
        const res = await axios.get(`${API_URL}/work-plan/${attendanceId}`);
        return res.data;
    }

    static async bulkUpdateTasks(tasks: any[]) {
        const res = await axios.put(`${API_URL}/work-plan/bulk-progress`, { tasks });
        return res.data;
    }

    static async checkOut(attendanceId: string) {
        const res = await axios.post(`${API_URL}/attendance/check-out`, { attendanceId });
        return res.data;
    }
}

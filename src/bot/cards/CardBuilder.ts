import { CardFactory } from 'botbuilder';

export class CardBuilder {
  static getCheckInCard() {
    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: 'Good Morning,',
          weight: 'Bolder',
          size: 'Medium',
        },
        {
          type: 'TextBlock',
          text: 'Status: Not Checked In',
          isSubtle: true,
        },
      ],
      actions: [
        {
          type: 'Action.Execute',
          title: 'Check In',
          data: { action: 'checkIn' },
        },
        {
          type: 'Action.Execute',
          title: 'Apply Leave',
          data: { action: 'applyLeave' },
        },
        {
          type: 'Action.Execute',
          title: 'Cancel',
          style: 'destructive',
          data: { action: 'cancelProcess' },
        },
      ],
    });
  }

  static getLeaveRequestCard(validationError?: string, previousValues?: any) {
    const body: any[] = [
      {
        type: 'TextBlock',
        text: 'Leave Request',
        weight: 'Bolder',
        size: 'Medium',
      },
    ];

    if (validationError) {
      body.push({
        type: 'TextBlock',
        text: `Error: ${validationError}`,
        color: 'Attention',
        weight: 'Bolder',
        wrap: true,
      });
    }

    body.push(
      {
        type: 'TextBlock',
        text: 'Leave Type',
        weight: 'Bolder',
      },
      {
        type: 'Input.ChoiceSet',
        id: 'leaveType',
        style: 'compact',
        value: previousValues?.leaveType || 'Sick',
        choices: [
          { title: 'Sick Leave', value: 'Sick' },
          { title: 'Personal Leave', value: 'Personal' },
          { title: 'Earned Leave', value: 'Earned' },
        ],
      },
      {
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [
              { type: 'TextBlock', text: 'Start Date', weight: 'Bolder' },
              {
                type: 'Input.Date',
                id: 'startDate',
                value: previousValues?.startDate,
              },
            ],
          },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              { type: 'TextBlock', text: 'End Date', weight: 'Bolder' },
              {
                type: 'Input.Date',
                id: 'endDate',
                value: previousValues?.endDate,
              },
            ],
          },
        ],
      },
      {
        type: 'TextBlock',
        text: 'Reason / Description',
        weight: 'Bolder',
      },
      {
        type: 'Input.Text',
        id: 'reason',
        placeholder: 'Reason for leave (e.g., Doctor appointment)',
        isMultiline: true,
        value: previousValues?.reason,
      },
    );

    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: body,
      actions: [
        {
          type: 'Action.Execute',
          title: 'Submit Leave Request',
          style: 'positive',
          data: { action: 'submitLeave' },
        },
        {
          type: 'Action.Execute',
          title: 'Cancel',
          style: 'destructive',
          data: { action: 'cancelLeave' },
        },
      ],
    });
  }

  static getWorkingCard(attendanceId: string) {
    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: 'Active Session',
          weight: 'Bolder',
          size: 'Medium',
          color: 'Good',
        },
        {
          type: 'TextBlock',
          text: 'Status: Working',
          isSubtle: true,
        }
      ],
      actions: [
        {
          type: 'Action.Execute',
          title: 'Start Break',
          data: { action: 'startBreak', attendanceId: attendanceId },
        },
        {
          type: 'Action.Execute',
          title: 'Check Out',
          data: { action: 'checkOut', attendanceId: attendanceId },
        },
        {
          type: 'Action.Execute',
          title: 'Add / Edit Plan',
          data: { action: 'editPlan', attendanceId: attendanceId },
        },
        {
          type: 'Action.Execute',
          title: 'Apply Leave',
          data: { action: 'applyLeave' },
        },
        {
          type: 'Action.Execute',
          title: 'Cancel',
          style: 'destructive',
          data: { action: 'cancelProcess' },
        },
      ],
    });
  }

  static getOnBreakCard(attendanceId: string) {
    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: 'On Break',
          weight: 'Bolder',
          size: 'Medium',
          color: 'Warning',
        },
      ],
      actions: [
        {
          type: 'Action.Execute',
          title: 'Resume Work',
          data: { action: 'endBreak', attendanceId: attendanceId },
        },
      ],
    });
  }

  static getReadOnlyReceiptCard(title: string, message: string) {
    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: title,
          weight: 'Bolder',
          size: 'Medium',
          color: 'Good',
        },
        {
          type: 'TextBlock',
          text: message,
          isSubtle: true,
        },
      ],
    });
  }

  static getLeaveApprovalCard(leaveId: string, employeeName: string, leaveType: string, startDate: string, endDate: string, reason: string) {
    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: 'Leave Request Pending',
          weight: 'Bolder',
          size: 'Medium',
          color: 'Warning',
        },
        {
          type: 'FactSet',
          facts: [
            { title: 'Employee:', value: employeeName },
            { title: 'Type:', value: leaveType },
            { title: 'Dates:', value: `${startDate} to ${endDate}` },
            { title: 'Reason:', value: reason },
          ]
        }
      ],
      actions: [
        {
          type: 'Action.Execute',
          title: 'Approve',
          style: 'positive',
          data: { action: 'approveLeave', leaveId: leaveId },
        },
        {
          type: 'Action.Execute',
          title: 'Reject',
          style: 'destructive',
          data: { action: 'rejectLeave', leaveId: leaveId },
        },
      ],
    });
  }
}

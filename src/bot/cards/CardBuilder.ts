import { CardFactory } from 'botbuilder';

export class CardBuilder {
  /** `headline` replaces the greeting - the morning reminder uses it. */
  static getCheckInCard(
    employeeName: string,
    quote?: string,
    headline?: string,
  ) {
    const body: any[] = [
      {
        type: 'TextBlock',
        text: headline || `Ready to slay the day, ${employeeName}? ✨`,
        wrap: true,
        weight: 'Bolder',
        size: 'Medium',
      },
      {
        type: 'TextBlock',
        text: 'Status: Not Checked In',
        isSubtle: true,
      },
    ];

    if (quote) {
      body.push({
        type: 'TextBlock',
        text: quote,
        wrap: true,
        isSubtle: true,
        spacing: 'Medium',
      });
    }

    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: body,
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
          { title: 'Permission', value: 'Permission' },
        ],
      },
      {
        type: 'TextBlock',
        text: 'Duration',
        weight: 'Bolder',
      },
      {
        type: 'Input.ChoiceSet',
        id: 'leaveMode',
        style: 'expanded',
        value: previousValues?.leaveMode || 'days',
        choices: [
          { title: 'Full day(s)', value: 'days' },
          { title: 'Few hours (fill From / To time below)', value: 'hours' },
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
              {
                type: 'TextBlock',
                text: 'End Date (full days)',
                weight: 'Bolder',
              },
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
        type: 'ColumnSet',
        columns: [
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: 'From Time (hours)',
                weight: 'Bolder',
              },
              {
                type: 'Input.Time',
                id: 'startTime',
                value: previousValues?.startTime,
              },
            ],
          },
          {
            type: 'Column',
            width: 'stretch',
            items: [
              {
                type: 'TextBlock',
                text: 'To Time (hours)',
                weight: 'Bolder',
              },
              {
                type: 'Input.Time',
                id: 'endTime',
                value: previousValues?.endTime,
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

  /** `headline` replaces the greeting - the evening check-out reminder uses it. */
  static getWorkingCard(
    attendanceId: string,
    employeeName: string,
    headline?: string,
  ) {
    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text: headline || `You're crushing it, ${employeeName}! 🔥`,
          wrap: true,
          weight: 'Bolder',
          size: 'Medium',
          color: 'Good',
        },
        {
          type: 'TextBlock',
          text: 'Status: In the Zone (Working)',
          isSubtle: true,
        },
        // Break buttons get their own row: Teams caps a card's top-level actions at 5.
        {
          type: 'ActionSet',
          actions: [
            {
              type: 'Action.Execute',
              title: '☕ Start Break',
              data: { action: 'startBreak', attendanceId: attendanceId },
            },
            {
              type: 'Action.Execute',
              title: '🍱 Lunch Break',
              data: {
                action: 'startBreak',
                attendanceId: attendanceId,
                breakType: 'lunch',
              },
            },
          ],
        },
      ],
      actions: [
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

  static getOnBreakCard(
    attendanceId: string,
    employeeName: string,
    breakType: string = 'break',
  ) {
    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: [
        {
          type: 'TextBlock',
          text:
            breakType === 'lunch'
              ? `Enjoy your lunch, ${employeeName} 🍱`
              : `Vibing on break, ${employeeName} ☕`,
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

  /**
   * Sent the morning after a forgotten check-out was closed automatically, so the
   * employee can put in when they actually finished.
   */
  static getAutoCheckOutNoticeCard(
    attendanceId: string,
    day: string,
    recordedAt: string,
    worked: string,
    validationError?: string,
  ) {
    const body: any[] = [
      {
        type: 'TextBlock',
        text: `⏰ You didn't check out on ${day}`,
        weight: 'Bolder',
        size: 'Medium',
        wrap: true,
      },
      {
        type: 'TextBlock',
        text: `I checked you out automatically at ${recordedAt}, which counts ${worked} of work. If you finished at a different time, enter it below.`,
        wrap: true,
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
      { type: 'TextBlock', text: 'Actual check-out time', weight: 'Bolder' },
      { type: 'Input.Time', id: 'checkOutTime', value: '' },
    );
    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body,
      actions: [
        {
          type: 'Action.Execute',
          title: 'Update Check-out',
          style: 'positive',
          data: { action: 'correctCheckOut', attendanceId },
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
          wrap: true,
        },
      ],
    });
  }

  static getLeaveApprovalCard(
    leaveId: string,
    employeeName: string,
    leaveType: string,
    period: string,
    reason: string,
    balance?: string | null,
  ) {
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
            { title: 'When:', value: period },
            { title: 'Reason:', value: reason },
            ...(balance ? [{ title: 'Balance:', value: balance }] : []),
          ],
        },
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

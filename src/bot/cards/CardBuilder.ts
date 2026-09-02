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
          type: 'Action.Submit',
          title: 'Check In',
          data: { action: 'checkIn' },
        },
        {
          type: 'Action.Submit',
          title: 'Apply Leave',
          data: { action: 'applyLeave' },
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
          type: 'Action.Submit',
          title: 'Submit Leave Request',
          style: 'positive',
          data: { action: 'submitLeave' },
        },
        {
          type: 'Action.Submit',
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
          text: 'Working',
          weight: 'Bolder',
          size: 'Medium',
          color: 'Good',
        },
      ],
      actions: [
        {
          type: 'Action.Submit',
          title: 'Start Break',
          data: { action: 'startBreak', attendanceId: attendanceId },
        },
        {
          type: 'Action.Submit',
          title: 'Check Out',
          data: { action: 'checkOut', attendanceId: attendanceId },
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
          type: 'Action.Submit',
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
}

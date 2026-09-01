import { CardFactory } from 'botbuilder';

export class ReviewTasksCard {
  static getCard(attendanceId: string, tasks: any[]) {
    if (!tasks || tasks.length === 0) {
      return CardFactory.adaptiveCard({
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        type: 'AdaptiveCard',
        version: '1.3',
        body: [
          {
            type: 'TextBlock',
            text: 'End of Day Checkout',
            weight: 'Bolder',
            size: 'Medium',
          },
          {
            type: 'TextBlock',
            text: "You didn't plan any tasks today. Let's clock out!",
            wrap: true,
          },
        ],
        actions: [
          {
            type: 'Action.Submit',
            title: 'Clock Out',
            style: 'default',
            data: { action: 'submitReview', attendanceId: attendanceId },
          },
        ],
      });
    }

    const body: any[] = [
      {
        type: 'TextBlock',
        text: 'End of Day: Task Review',
        weight: 'Bolder',
        size: 'Medium',
      },
      {
        type: 'TextBlock',
        text: 'Please provide an update on the tasks you planned this morning before checking out.',
        isSubtle: true,
        wrap: true,
      },
    ];

    // Headers
    body.push({
      type: 'ColumnSet',
      spacing: 'Medium',
      columns: [
        {
          type: 'Column',
          width: '40',
          items: [
            {
              type: 'TextBlock',
              text: 'Task',
              weight: 'Bolder',
              size: 'Small',
            },
          ],
        },
        {
          type: 'Column',
          width: '30',
          items: [
            {
              type: 'TextBlock',
              text: 'Status',
              weight: 'Bolder',
              size: 'Small',
            },
          ],
        },
        {
          type: 'Column',
          width: '30',
          items: [
            {
              type: 'TextBlock',
              text: 'Time Taken',
              weight: 'Bolder',
              size: 'Small',
            },
          ],
        },
      ],
    });

    for (const task of tasks) {
      body.push({
        type: 'Container',
        style: 'emphasis',
        items: [
          {
            type: 'ColumnSet',
            columns: [
              {
                type: 'Column',
                width: '40',
                items: [
                  {
                    type: 'TextBlock',
                    text: task.taskName,
                    wrap: true,
                    weight: 'Bolder',
                  },
                ],
              },
              {
                type: 'Column',
                width: '30',
                items: [
                  {
                    type: 'Input.ChoiceSet',
                    id: `status_${task.id}`,
                    style: 'compact',
                    value: 'completed',
                    choices: [
                      { title: 'Completed', value: 'completed' },
                      { title: 'In Progress', value: 'in_progress' },
                      { title: 'Blocked', value: 'blocked' },
                    ],
                  },
                ],
              },
              {
                type: 'Column',
                width: '30',
                items: [
                  {
                    type: 'Input.ChoiceSet',
                    id: `timeTaken_${task.id}`,
                    style: 'compact',
                    value: task.estimatedMinutes
                      ? task.estimatedMinutes.toString()
                      : '60',
                    choices: [
                      { title: '15 mins', value: '15' },
                      { title: '30 mins', value: '30' },
                      { title: '45 mins', value: '45' },
                      { title: '1 hr', value: '60' },
                      { title: '1.5 hrs', value: '90' },
                      { title: '2 hrs', value: '120' },
                      { title: '3 hrs', value: '180' },
                      { title: '4 hrs', value: '240' },
                      { title: '8 hrs', value: '480' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'Input.Text',
            id: `remarks_${task.id}`,
            placeholder: 'Brief description of work done (optional)',
            isMultiline: true,
          },
        ],
      });
    }

    return CardFactory.adaptiveCard({
      $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
      type: 'AdaptiveCard',
      version: '1.3',
      body: body,
      actions: [
        {
          type: 'Action.Submit',
          title: 'Submit Review & Check Out',
          style: 'default',
          data: { action: 'submitReview', attendanceId: attendanceId },
        },
      ],
    });
  }
}

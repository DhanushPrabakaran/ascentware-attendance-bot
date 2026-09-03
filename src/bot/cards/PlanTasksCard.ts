import { CardFactory } from 'botbuilder';

export class PlanTasksCard {
  static getCard(
    attendanceId: string,
    validationError?: string,
    previousValues?: any,
  ) {
    const body: any[] = [
      {
        type: 'TextBlock',
        text: 'Day started! Plan your Tasks',
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

    const taskColumn: any = {
      type: 'Column',
      width: 'stretch',
      items: [
        {
          type: 'TextBlock',
          text: 'Task Name',
          weight: 'Bolder',
          size: 'Small',
          spacing: 'Small',
        },
      ],
    };
    const priorityColumn: any = {
      type: 'Column',
      width: '90px',
      items: [
        {
          type: 'TextBlock',
          text: 'Priority',
          weight: 'Bolder',
          size: 'Small',
          spacing: 'Small',
        },
      ],
    };
    const timeColumn: any = {
      type: 'Column',
      width: '80px',
      items: [
        {
          type: 'TextBlock',
          text: 'Est. Time',
          weight: 'Bolder',
          size: 'Small',
          spacing: 'Small',
        },
      ],
    };
    const actionColumn: any = {
      type: 'Column',
      width: 'auto',
      items: [
        { type: 'TextBlock', text: ' ', size: 'Small', spacing: 'Small' },
      ],
    };

    let visibleRowsCount = 1;
    if (previousValues) {
      for (let i = 5; i >= 1; i--) {
        if (previousValues[`taskName_${i}`]) {
          visibleRowsCount = i;
          break;
        }
      }
    }

    for (let i = 1; i <= 5; i++) {
      const isVisible = i <= visibleRowsCount;

      const tNameVal = previousValues
        ? previousValues[`taskName_${i}`]
        : undefined;
      const pVal = previousValues
        ? previousValues[`priority_${i}`] || 'Normal'
        : 'Normal';
      const timeVal = previousValues
        ? previousValues[`estimatedMinutes_${i}`]
        : undefined;

      taskColumn.items.push({
        type: 'Input.Text',
        id: `taskName_${i}`,
        placeholder: `Task ${i}`,
        isVisible: isVisible,
        spacing: 'Small',
        value: tNameVal,
      });

      priorityColumn.items.push({
        type: 'Input.ChoiceSet',
        id: `priority_${i}`,
        style: 'compact',
        value: pVal,
        isVisible: isVisible,
        spacing: 'Small',
        choices: [
          { title: 'Low', value: 'Low' },
          { title: 'Normal', value: 'Normal' },
          { title: 'High', value: 'Important / High' },
        ],
      });

      timeColumn.items.push({
        type: 'Input.ChoiceSet',
        id: `estimatedMinutes_${i}`,
        style: 'compact',
        placeholder: 'Time',
        value: timeVal,
        isVisible: isVisible,
        spacing: 'Small',
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
      });

      if (i > 1) {
        actionColumn.items.push({
          type: 'Image',
          id: `removeBtn_${i}`,
          isVisible: isVisible,
          url: 'https://img.icons8.com/color/48/000000/delete-sign--v1.png',
          width: '25px',
          height: '25px',
          spacing: 'Medium',
          horizontalAlignment: 'Center',
          selectAction: {
            type: 'Action.ToggleVisibility',
            targetElements: [
              { elementId: `taskName_${i}`, isVisible: false },
              { elementId: `priority_${i}`, isVisible: false },
              { elementId: `estimatedMinutes_${i}`, isVisible: false },
              { elementId: `removeBtn_${i}`, isVisible: false },
              { elementId: `addBtnContainer_${i - 1}`, isVisible: true },
              { elementId: `addBtnContainer_${i}`, isVisible: false },
            ],
          },
        });
      } else {
        actionColumn.items.push({
          type: 'TextBlock',
          text: ' ',
          spacing: 'Medium',
        });
      }
    }

    body.push({
      type: 'ColumnSet',
      spacing: 'Medium',
      columns: [taskColumn, priorityColumn, timeColumn, actionColumn],
    });

    for (let i = 1; i < 5; i++) {
      body.push({
        type: 'Container',
        id: `addBtnContainer_${i}`,
        isVisible: i === visibleRowsCount,
        spacing: 'Small',
        items: [
          {
            type: 'ActionSet',
            actions: [
              {
                type: 'Action.ToggleVisibility',
                title: '+ Add Another Task',
                targetElements: [
                  { elementId: `taskName_${i + 1}`, isVisible: true },
                  { elementId: `priority_${i + 1}`, isVisible: true },
                  { elementId: `estimatedMinutes_${i + 1}`, isVisible: true },
                  { elementId: `removeBtn_${i + 1}`, isVisible: true },
                  { elementId: `addBtnContainer_${i + 1}`, isVisible: true },
                  { elementId: `addBtnContainer_${i}`, isVisible: false },
                ],
              },
            ],
          },
        ],
      });
    }

    const permVal = previousValues
      ? previousValues['permissionMinutes'] || '0'
      : '0';

    body.push(
      {
        type: 'TextBlock',
        text: 'Any Approved Leave/Permission today?',
        weight: 'Bolder',
        spacing: 'Medium',
      },
      {
        type: 'Input.ChoiceSet',
        id: 'permissionMinutes',
        style: 'compact',
        value: permVal,
        choices: [
          { title: 'None (0 hrs)', value: '0' },
          { title: '1 Hour', value: '60' },
          { title: '2 Hours', value: '120' },
          { title: '3 Hours', value: '180' },
          { title: '4 Hours (Half Day)', value: '240' },
        ],
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
          title: 'Save Plan & Start Working',
          style: 'positive',
          data: { action: 'saveAllTasks', attendanceId: attendanceId },
        },
        {
          type: 'Action.Execute',
          title: 'Cancel',
          style: 'destructive',
          data: { action: 'cancelPlanTasks', attendanceId: attendanceId },
        },
      ],
    });
  }
}

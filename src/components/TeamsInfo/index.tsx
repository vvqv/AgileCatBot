import React from 'react';

import { Button, ButtonGroup, useRouter } from '@urban-bot/core';

import { TREATMENTS } from '@src/constants';

export function TeamsInfo() {
    const { navigate } = useRouter();
    return (
        <ButtonGroup title={TREATMENTS.selectTeam} isNewMessageEveryRender={false}>
            <Button onClick={() => navigate('/start')}>Назад</Button>
        </ButtonGroup>
    );
}

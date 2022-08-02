import React, { useEffect } from 'react';

import { Button, ButtonGroup, useRouter } from '@urban-bot/core';

import { coreActions, coreSelectors } from '@reducers/core';
import { useDispatch, useSelector } from '@reducers/store';
import { COMMANDS } from '@src/constants';
import { isDefined, isNotNil } from '@src/utils';
import { version } from 'package-json';

export function getMainMenuMessage() {
    return `Мяу! Вас приветствует Agile Cat \u{1F638}\n Текущая версия: ${version}\nВыбери действие:`;
}

type ButtonProps = { handler: () => void; title: string };

function useMainMenuItems() {
    const userChatsInfo = useSelector(coreSelectors.getUserChatsInfo);
    const userInfo = useSelector(coreSelectors.getUserInfo);
    const { navigate } = useRouter();
    const hasUserSelectedChat = isDefined(userChatsInfo.active);
    const hasManyChats = userChatsInfo.available.length > 1;

    const hasUserTeam = isNotNil(userInfo.team);
    console.log(hasUserTeam);
    const dispatch = useDispatch();

    const userChatItems: ButtonProps[] = userChatsInfo.available.map((chat) => ({
        title: `\u{1F4AC} ${chat.title || ''}`,
        handler: () => dispatch(coreActions.setActiveChat(chat)),
    }));

    const reducedAccessItems: ButtonProps[] = [
        { title: `${COMMANDS.getInfo} \u{2139}`, handler: () => navigate('/info') },
        { title: `${COMMANDS.selectTeam} \u{1F464}`, handler: () => navigate('/select') },
    ];

    return !hasUserSelectedChat && hasManyChats ? userChatItems : reducedAccessItems;
}

export function MainMenu() {
    const userChatsInfo = useSelector(coreSelectors.getUserChatsInfo);
    const userInfo = useSelector(coreSelectors.getUserInfo);
    const { isLoading } = useSelector(coreSelectors.getCurrentSystemInfo);
    const dispatch = useDispatch();

    const items = useMainMenuItems();

    const message = getMainMenuMessage();

    useEffect(() => {
        if (!isLoading && isNotNil(userInfo.data)) {
            dispatch(
                isDefined(userChatsInfo.active)
                    ? coreActions.getUserTeamRequest()
                    : coreActions.getUserAvailableChatsRequest({ userId: userInfo.data.userId })
            );
        }
    }, [userChatsInfo.active, userInfo.data]);

    // const items = userChatsInfo.available.map((chat) => (
    //     <Button onClick={() => handleSelectChat(chat)}>{chat.title || ''}</Button>
    // ));

    return (
        <ButtonGroup title={message} isNewMessageEveryRender={false}>
            {items.map(({ handler, title }) => (
                <Button onClick={handler}>{title}</Button>
            ))}
        </ButtonGroup>
    );
}

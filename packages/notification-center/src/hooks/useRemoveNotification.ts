import { useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import type { IMessage } from '@novu/shared';

import { useNovuContext } from './useNovuContext';
import { INFINITE_NOTIFICATIONS_QUERY_KEY } from './queryKeys';

interface IRemoveNotificationVariables {
  messageId: string;
}

export const useRemoveNotification = ({
  onSuccess,
  ...options
}: UseMutationOptions<IMessage, Error, IRemoveNotificationVariables> = {}) => {
  const queryClient = useQueryClient();
  const { apiService, subscriberId } = useNovuContext();

  const { mutate, ...result } = useMutation<IMessage, Error, IRemoveNotificationVariables>(
    ({ messageId }) => apiService.removeMessage(messageId),
    {
      ...options,
      onSuccess: (data, variables, context) => {
        queryClient.refetchQueries([...INFINITE_NOTIFICATIONS_QUERY_KEY, subscriberId], { exact: false });
        onSuccess?.(data, variables, context);
      },
    }
  );

  return { ...result, removeNotification: mutate };
};

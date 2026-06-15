package backend.mapper;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import backend.dto.chat.ChatMessageResponse;
import backend.model.chat.ChatMessage;

@Mapper(componentModel = "spring")
public interface ChatMapper {
    @Mapping(source = "chatRoom.id", target = "roomId")
    @Mapping(source = "chatRoom.roomKey", target = "roomKey")
    @Mapping(source = "chatRoom.hireRequestId", target = "hireRequestId")
    @Mapping(source = "chatRoom.projectId", target = "projectId")
    @Mapping(source = "chatRoom.gigId", target = "gigId")
    @Mapping(source = "chatRoom.projectTitle", target = "projectTitle")
    @Mapping(source = "sender.id", target = "senderId")
    @Mapping(source = "sender.username", target = "senderName")
    @Mapping(source = "sender.email", target = "senderEmail")
    @Mapping(source = "receiver.id", target = "receiverId")
    @Mapping(source = "receiver.username", target = "receiverName")
    @Mapping(source = "receiver.email", target = "receiverEmail")
    ChatMessageResponse toChatMessageResponse(ChatMessage message);
}

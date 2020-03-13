import $ from 'jquery'

export class VkMessagesService {
  static initMessages() {
    $('body').append('<div id="vk_community_messages"></div>')
    window.VK.Widgets.CommunityMessages('vk_community_messages', 169568508, {
      disableButtonTooltip: '1',
    })
  }
}
